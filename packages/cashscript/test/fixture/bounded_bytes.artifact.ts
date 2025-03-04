export default {
  contractName: 'BoundedBytes',
  constructorInputs: [],
  abi: [
    {
      name: 'spend',
      inputs: [
        {
          name: 'b',
          type: 'bytes4',
        },
        {
          name: 'i',
          type: 'int',
        },
      ],
    },
  ],
  bytecode: 'OP_SWAP OP_4 OP_NUM2BIN OP_EQUAL',
  source: 'contract BoundedBytes() {\n    function spend(bytes4 b, int i) {\n        require(b == bytes4(i));\n    }\n}\n',
  debug: {
    bytecode: '007a517a548087',
    sourceMap: '3:16:3:17;;:28::29;;:21::30:1;;:16',
    logs: [],
    requires: [
      {
        ip: 7,
        line: 3,
      },
    ],
  },
  compiler: {
    name: 'cashc',
    version: '0.10.4',
  },
  updatedAt: '2024-12-03T13:57:09.177Z',
} as const;
