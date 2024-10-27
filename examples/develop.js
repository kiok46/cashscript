import { URL } from 'url';
import { compileFile } from '../packages/cashc/dist/index.js';
import { ElectrumNetworkProvider, Contract, SignatureTemplate } from '../packages/cashscript/dist/index.js';
import { stringify } from '@bitauth/libauth';

// Import Alice's keys from common-js.js
import { alicePkh, alicePriv, alicePub } from './common-js.js';

// Compile the P2PKH contract to an artifact object
const artifact = compileFile(new URL('p2pkh.cash', import.meta.url));

// Initialise a network provider for network operations on CHIPNET
const provider = new ElectrumNetworkProvider('chipnet');

// Instantiate a new contract using the compiled artifact and network provider
// AND providing the constructor parameters (pkh: alicePkh)
const contract = new Contract(artifact, [alicePkh], { provider });

// Get contract balance & output address + balance
console.log('contract address:', contract.address);
console.log('contract balance:', await contract.getBalance());

// Call the spend function with alice's signature + pk
// And use it to send 0. 000 100 00 BCH back to the contract's address
const tx = await contract.functions
  .spend(alicePub, new SignatureTemplate(alicePriv))
  .to(contract.address, 10000n)
  .build();

console.log('transaction details:', stringify(tx));
