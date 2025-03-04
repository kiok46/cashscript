export default {
  contractName: 'TransferWithTimeout',
  constructorInputs: [
    {
      name: 'sender',
      type: 'pubkey',
    },
    {
      name: 'recipient',
      type: 'pubkey',
    },
    {
      name: 'timeout',
      type: 'int',
    },
  ],
  abi: [
    {
      name: 'transfer',
      inputs: [
        {
          name: 'recipientSig',
          type: 'sig',
        },
      ],
    },
    {
      name: 'timeout',
      inputs: [
        {
          name: 'senderSig',
          type: 'sig',
        },
      ],
    },
  ],
  bytecode: 'OP_3 OP_PICK OP_0 OP_NUMEQUAL OP_IF OP_4 OP_ROLL OP_ROT OP_CHECKSIG OP_NIP OP_NIP OP_NIP OP_ELSE OP_3 OP_ROLL OP_1 OP_NUMEQUALVERIFY OP_3 OP_ROLL OP_SWAP OP_CHECKSIGVERIFY OP_SWAP OP_CHECKLOCKTIMEVERIFY OP_2DROP OP_1 OP_ENDIF',
  source: 'contract TransferWithTimeout(\n    pubkey sender,\n    pubkey recipient,\n    int timeout\n) {\n    // Require recipient\'s signature to match\n    function transfer(sig recipientSig) {\n        require(checkSig(recipientSig, recipient));\n    }\n\n    // Require timeout time to be reached and sender\'s signature to match\n    function timeout(sig senderSig) {\n        require(checkSig(senderSig, sender));\n        require(tx.time >= timeout);\n    }\n}\n',
  debug: {
    bytecode: '5379009c63547a527aac77777767537a519c69537a517aac69517ab175517768',
    sourceMap: '7:4:9:5;;;;;8:25:8:37;;:39::48;;:16::49:1;7:4:9:5;;;;12::15::0;;;;;13:25:13:34;;:36::42;;:16::43:1;:8::45;14:27:14:34:0;;:8::36:1;;12:4:15:5;;1:0:16:1',
    logs: [],
    requires: [
      {
        ip: 13,
        line: 8,
      },
      {
        ip: 27,
        line: 13,
      },
      {
        ip: 30,
        line: 14,
      },
    ],
  },
  compiler: {
    name: 'cashc',
    version: '0.10.4',
  },
  updatedAt: '2024-12-03T13:57:10.112Z',
} as const;
