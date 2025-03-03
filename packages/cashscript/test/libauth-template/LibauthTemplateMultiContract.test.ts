import { fixtures } from '../fixture/libauth-template/multi-contract-fixtures.js';

describe('Libauth Template generation tests (multi-contract)', () => {
  fixtures.forEach((fixture) => {
    it(`should generate a valid libauth template for ${fixture.name}`, async () => {
      const builder = await fixture.transaction;
      const generatedTemplate = builder.getLibauthTemplate();
      // console.log(builder.bitauthUri());
      // console.log(JSON.stringify(generatedTemplate, null, 2));
      expect(generatedTemplate).toEqual(fixture.template);
    });
  });
});
