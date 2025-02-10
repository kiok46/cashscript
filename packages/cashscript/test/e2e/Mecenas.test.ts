import {
  Contract, ElectrumNetworkProvider, MockNetworkProvider, Network,
  TransactionBuilder,
  Utxo,
} from '../../src/index.js';
import {
  alicePkh,
  bobPkh,
  aliceAddress,
  bobAddress,
} from '../fixture/vars.js';
import { getTxOutputs } from '../test-util.js';
import { FailedRequireError } from '../../src/Errors.js';
import artifact from '../fixture/mecenas.artifact.js';
import { randomUtxo } from '../../src/utils.js';

// Mecenas has tx.age check omitted for testing
describe('Mecenas', () => {
  const provider = process.env.TESTS_USE_MOCKNET
    ? new MockNetworkProvider()
    : new ElectrumNetworkProvider(Network.CHIPNET);
  const pledge = 10000n;
  const mecenas = new Contract(artifact, [alicePkh, bobPkh, pledge], { provider });
  const minerFee = 1000n;
  let contractUtxo: Utxo;

  beforeAll(() => {
    console.log(mecenas.address);
    contractUtxo = randomUtxo();
    (provider as any).addUtxo?.(mecenas.address, contractUtxo);
  });

  describe('send', () => {
    it('should fail when trying to send more than pledge', async () => {
      // given
      const recipient = aliceAddress;
      const pledgeAmount = pledge + 10n;

      // when
      const txPromise = new TransactionBuilder({ provider })
        .addInput(contractUtxo, mecenas.unlock.receive())
        .addOutput({ to: recipient, amount: pledgeAmount })
        .addOutput({ to: mecenas.address, amount: contractUtxo.satoshis - pledgeAmount - minerFee })
        .send();

      // then
      await expect(txPromise).rejects.toThrow(FailedRequireError);
      await expect(txPromise).rejects.toThrow('Mecenas.cash:24 Require statement failed at input 0 in contract Mecenas.cash at line 24.');
      await expect(txPromise).rejects.toThrow('Failing statement: require(tx.outputs[0].value == pledge)');
    });

    it('should fail when trying to send to wrong person', async () => {
      // given
      const recipient = bobAddress;
      const pledgeAmount = pledge;

      // when
      const txPromise = new TransactionBuilder({ provider })
        .addInput(contractUtxo, mecenas.unlock.receive())
        .addOutput({ to: recipient, amount: pledgeAmount })
        .addOutput({ to: mecenas.address, amount: contractUtxo.satoshis - pledgeAmount - minerFee })
        .send();

      // then
      await expect(txPromise).rejects.toThrow(FailedRequireError);
      await expect(txPromise).rejects.toThrow('Mecenas.cash:13 Require statement failed at input 0 in contract Mecenas.cash at line 13.');
      await expect(txPromise).rejects.toThrow('Failing statement: require(tx.outputs[0].lockingBytecode == new LockingBytecodeP2PKH(recipient))');
    });

    it('should fail when trying to send to multiple people', async () => {
      // given
      const recipient = aliceAddress;
      const pledgeAmount = pledge;

      // when
      const txPromise = new TransactionBuilder({ provider })
        .addInput(contractUtxo, mecenas.unlock.receive())
        .addOutput({ to: recipient, amount: pledgeAmount })
        .addOutput({ to: recipient, amount: pledgeAmount })
        .addOutput({ to: mecenas.address, amount: contractUtxo.satoshis - pledgeAmount - minerFee })
        .send();

      // then
      await expect(txPromise).rejects.toThrow(FailedRequireError);
      await expect(txPromise).rejects.toThrow('Mecenas.cash:25 Require statement failed at input 0 in contract Mecenas.cash at line 25.');
      await expect(txPromise).rejects.toThrow('Failing statement: require(tx.outputs[1].lockingBytecode == tx.inputs[this.activeInputIndex].lockingBytecode)');
    });

    it('should fail when sending incorrect amount of change', async () => {
      // given
      const recipient = aliceAddress;
      const pledgeAmount = pledge;

      // when
      const txPromise = new TransactionBuilder({ provider })
        .addInput(contractUtxo, mecenas.unlock.receive())
        .addOutput({ to: recipient, amount: pledgeAmount })
        .addOutput({ to: mecenas.address, amount: contractUtxo.satoshis - pledgeAmount - minerFee * 2n })
        .send();

      // then
      await expect(txPromise).rejects.toThrow(FailedRequireError);
      await expect(txPromise).rejects.toThrow('Mecenas.cash:26 Require statement failed at input 0 in contract Mecenas.cash at line 26.');
      await expect(txPromise).rejects.toThrow('Failing statement: require(tx.outputs[1].value == changeValue)');
    });

    it('should succeed when sending pledge to receiver', async () => {
      // given
      const recipient = aliceAddress;
      const pledgeAmount = pledge;

      // when
      const tx = await new TransactionBuilder({ provider })
        .addInput(contractUtxo, mecenas.unlock.receive())
        .addOutput({ to: recipient, amount: pledgeAmount })
        .addOutput({ to: mecenas.address, amount: contractUtxo.satoshis - pledgeAmount - minerFee })
        .send();
      // then
      const txOutputs = getTxOutputs(tx);
      expect(txOutputs).toEqual(expect.arrayContaining([{ to: recipient, amount: pledgeAmount }]));
    });
  });
});
