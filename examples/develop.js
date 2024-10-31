import { URL } from 'url';
import { compileFile } from '../packages/cashc/dist/index.js';
import { MockNetworkProvider, ElectrumNetworkProvider, Contract, SignatureTemplate, TransactionBuilder, randomUtxo } from '../packages/cashscript/dist/index.js';
import { stringify } from '@bitauth/libauth';

// Import Alice's keys from common-js.js
import { alicePkh, alicePriv, alicePub } from './common-js.js';

// Compile the P2PKH contract to an artifact object
const artifact = compileFile(new URL('p2pkh.cash', import.meta.url));

// Initialise a network provider for network operations on CHIPNET
// const provider = new ElectrumNetworkProvider('chipnet');
const provider = new MockNetworkProvider();

// Instantiate a new contract using the compiled artifact and network provider
// AND providing the constructor parameters (pkh: alicePkh)
const contract = new Contract(artifact, [alicePkh], { provider });
provider.addUtxo(contract.address, randomUtxo());
provider.addUtxo(contract.address, randomUtxo());
// Get contract balance & output address + balance
console.log('contract address:', contract.address);
console.log('contract balance:', await contract.getBalance());

const contractUtxos = await contract.getUtxos();
console.log('contract utxos:', contractUtxos);

// console.log(contract.unlock)

// Call the spend function with alice's signature + pk
// And use it to send 0. 000 100 00 BCH back to the contract's address
const tx = await contract.functions
  .spend(alicePub, new SignatureTemplate(alicePriv))
  .to(contract.address, 10000n)
  .withoutChange()
  .build();

console.log('transaction details:', stringify(tx));


const advancedTransaction = await new TransactionBuilder({ provider })
  .addInput(
    contractUtxos[0],
    contract.unlock.spend(alicePub, new SignatureTemplate(alicePriv)),
    { contract, params: [alicePub, new SignatureTemplate(alicePriv)] },
  )
  .addInput(
    contractUtxos[1],
    contract.unlock.spend2(alicePub, new SignatureTemplate(alicePriv)),
    { contract, params: [alicePub, new SignatureTemplate(alicePriv)] },
  )
  .addOutput({ to: contract.address, amount: 10000n })
  .build();

console.log('transaction details:', stringify(advancedTransaction));
