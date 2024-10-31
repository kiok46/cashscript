import { URL } from 'url';
import { compileFile } from '../packages/cashc/dist/index.js';
import { MockNetworkProvider, ElectrumNetworkProvider, Contract, SignatureTemplate, TransactionBuilder, randomUtxo } from '../packages/cashscript/dist/index.js';
import { stringify } from '@bitauth/libauth';

// Import Alice's keys from common-js.js
import { alicePkh, alicePriv, alicePub } from './common-js.js';

// Initialise a network provider for network operations on CHIPNET
// const provider = new ElectrumNetworkProvider('chipnet');
const provider = new MockNetworkProvider();



const artifactA = compileFile(new URL('contractA.cash', import.meta.url));

const artifactB = compileFile(new URL('contractB.cash', import.meta.url));



// Instantiate a new contract using the compiled artifact and network provider
// AND providing the constructor parameters (pkh: alicePkh)
const contractA = new Contract(artifactA, [alicePkh], { provider });
provider.addUtxo(contractA.address, randomUtxo());
provider.addUtxo(contractA.address, randomUtxo());

const contractB = new Contract(artifactB, [alicePkh], { provider });
provider.addUtxo(contractB.address, randomUtxo());
provider.addUtxo(contractB.address, randomUtxo());
// Get contract balance & output address + balance
// console.log('contract address:', contractA.address);
// console.log('contract balance:', await contractA.getBalance());

const contractUtxos = await contractA.getUtxos();
// console.log('contract utxos:', contractUtxos);

// console.log(contract.unlock)

// Call the spend function with alice's signature + pk
// And use it to send 0. 000 100 00 BCH back to the contract's address
// const tx = await contract.functions
//   .spend(alicePub, new SignatureTemplate(alicePriv))
//   .to(contract.address, 10000n)
//   .withoutChange()
//   .bitauthUri();

// console.log('transaction details:', stringify(tx));


const advancedTransaction = await new TransactionBuilder({ provider })
  .addInput(
    contractUtxos[0],
    contractA.unlock.execute(alicePub, new SignatureTemplate(alicePriv)),
    { contract: contractA, params: [alicePub, new SignatureTemplate(alicePriv)], selector: 0 },
  )
  .addInput(
    contractUtxos[1],
    contractB.unlock.trigger(alicePub, new SignatureTemplate(alicePriv)),
    { contract: contractB, params: [alicePub, new SignatureTemplate(alicePriv)], selector: 2 },
  )
  .addOutput({ to: contractA.address, amount: 10000n })
  .bitauthUri();

console.log('transaction details:', stringify(advancedTransaction));
