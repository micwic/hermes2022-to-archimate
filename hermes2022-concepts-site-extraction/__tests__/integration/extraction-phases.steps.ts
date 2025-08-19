import { defineFeature, loadFeature } from 'jest-cucumber';

const feature = loadFeature(__dirname + '/extraction-phases.feature');

defineFeature(feature, (test) => {
  test('placeholder extraction-phases', ({ given, when, then }) => {
    given("un fichier d'extraction des phases", () => {});
    when("les phases sont validées", () => {});
    then("la validation des phases réussit", () => {});
  });
});
