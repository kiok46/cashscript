import { BITBOX } from 'bitbox-sdk';
import { ECPair } from 'bitcoincashjs-lib';
import { AddressUtxoResult, AddressDetailsResult, TxnDetailsResult } from 'bitcoin-com-rest';
import delay from 'delay';
import { AbiFunction, Abi, AbiParameter } from './ABI';
import { Script } from '../generation/Script';
import {
  bitbox,
  AddressUtil,
  ScriptUtil,
  CryptoUtil,
} from './BITBOX';
import { DUST_LIMIT } from './constants';
import {
  createInputScript,
  selectUtxos,
  typecheckParameter,
  encodeParameter,
} from './transaction-util';
import { SignatureAlgorithm } from './interfaces';

export type Parameter = number | boolean | string | Buffer | Sig;
export class Sig {
  constructor(public keypair: ECPair, public hashtype: number) {}
}

export class Contract {
  name: string;
  new: (...params: Parameter[]) => Instance;

  constructor(
    private abi: Abi,
    private network: string = 'mainnet',
  ) {
    this.name = abi.name;
    this.createConstructor(abi.constructorParameters);
  }

  private createConstructor(parameters: AbiParameter[]) {
    this.new = (...ps: Parameter[]) => {
      if (parameters.length !== ps.length) throw new Error();
      const encodedParameters = ps
        .map((p, i) => encodeParameter(p, parameters[i].type))
        .reverse();
      const redeemScript = [...encodedParameters, ...this.abi.uninstantiatedScript];
      return new Instance(this.abi, redeemScript, this.network);
    };
  }
}

type ContractFunction = (...parameters: Parameter[]) => Transaction

class Instance {
  name: string;
  address: string;
  functions: {
    [name: string]: ContractFunction,
  };

  private bitbox: BITBOX;

  async getBalance() {
    const details = await this.bitbox.Address.details(this.address) as AddressDetailsResult;
    return details.balanceSat + details.unconfirmedBalanceSat;
  }

  constructor(
    abi: Abi,
    private redeemScript: Script,
    private network: string,
  ) {
    this.bitbox = bitbox[network];

    this.name = abi.name;
    this.address = scriptToAddress(redeemScript, network);

    this.functions = {};
    if (abi.functions.length === 1) {
      const f = abi.functions[0];
      this.functions[f.name] = this.createFunction(f);
    } else {
      abi.functions.forEach((f, i) => {
        this.functions[f.name] = this.createFunction(f, i);
      });
    }
  }

  private createFunction(f: AbiFunction, selector?: number): ContractFunction {
    return (...ps: Parameter[]) => {
      if (f.parameters.length !== ps.length) throw new Error();
      ps.forEach((p, i) => typecheckParameter(p, f.parameters[i].type));
      return new Transaction(this.address, this.network, this.redeemScript, f, ps, selector);
    };
  }
}

export class Transaction {
  private bitbox: BITBOX;

  constructor(
    private address: string,
    private network: string,
    private redeemScript: Script,
    private abiFunction: AbiFunction,
    private parameters: Parameter[],
    private selector?: number,
  ) {
    this.bitbox = bitbox[network];
  }

  async send(to: string, amount: number) {
    const txBuilder = new this.bitbox.TransactionBuilder(this.network);
    const { utxos: allUtxos } = await this.bitbox.Address.utxo(this.address) as AddressUtxoResult;

    // Utxo selection with placeholder script for script size calculation
    const placeholderScript = createInputScript(
      this.redeemScript,
      this.abiFunction,
      this.parameters.map(p => (p instanceof Sig ? Buffer.alloc(65, 0) : p)),
      this.selector,
    );
    const { utxos, change } = selectUtxos(allUtxos, [{ to, amount }], placeholderScript);

    utxos.forEach((utxo) => {
      txBuilder.addInput(utxo.txid, utxo.vout);
    });
    txBuilder.addOutput(to, amount);

    if (change >= DUST_LIMIT) {
      txBuilder.addOutput(this.address, change);
    }

    // Vout is a misnomer used in BITBOX, should be vin
    const inputScripts: { vout: number, script: Buffer }[] = [];

    // Convert all Sig objects to valid tx signatures for current tx
    const tx = txBuilder.transaction.buildIncomplete();
    utxos.forEach((utxo, vin) => {
      const cleanedPs = this.parameters.map((p) => {
        if (!(p instanceof Sig)) return p;

        // Bitcoin cash replay protection
        const hashtype = p.hashtype | tx.constructor.SIGHASH_BITCOINCASHBIP143;
        const sighash = tx.hashForCashSignature(
          vin, ScriptUtil.encode(this.redeemScript), utxo.satoshis, hashtype,
        );
        return p.keypair
          .sign(sighash, SignatureAlgorithm.SCHNORR)
          .toScriptSignature(hashtype, SignatureAlgorithm.SCHNORR);
      });

      const inputScript = createInputScript(
        this.redeemScript, this.abiFunction, cleanedPs, this.selector,
      );
      inputScripts.push({ vout: vin, script: inputScript });
    });

    // Add all generated input scripts to the transaction
    txBuilder.addInputScripts(inputScripts);

    const finalTx = txBuilder.build();

    const txid = await this.bitbox.RawTransactions.sendRawTransaction(finalTx.toHex());
    await delay(2000);

    return await this.bitbox.Transaction.details(txid) as TxnDetailsResult;
  }
}

function scriptToAddress(script: Script, network: string): string {
  return AddressUtil.fromOutputScript(
    ScriptUtil.encodeP2SHOutput(
      CryptoUtil.hash160(
        ScriptUtil.encode(script),
      ),
    ),
    network,
  );
}
