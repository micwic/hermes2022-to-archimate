// Setup for Jest-Cucumber
// This file is executed before each test suite

// Global test setup
beforeAll(() => {
  // Setup global test environment if needed
  console.log('[tests] Initialisation de l\'environnement de test');
});

// Cleanup after all tests
afterAll(() => {
  // Cleanup if needed
  console.log('[tests] Nettoyage de l\'environnement de test');
});

// Setup before each test
beforeEach(() => {
  // Reset any global state if needed
});

// Cleanup after each test
afterEach(() => {
  // Cleanup after each test if needed
});
