/**
 * Tests for BiometricService — SecureStore migration (TASK-MOB-W7-01 / FND-069)
 *
 * Verifies that the biometric-enabled flag is stored in expo-secure-store,
 * not AsyncStorage, and that the one-time read-fallback migrates existing
 * users from the old AsyncStorage key to SecureStore transparently.
 */

// Keys matching the implementation (verified via behaviour)
const OLD_ASYNC_KEY = "@fynvita_biometric_enabled";
const NEW_SECURE_KEY = "@fynvita/biometric/enabled";
const NEW_SECURE_TYPE_KEY = "@fynvita/biometric/type";

jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  getEnrolledLevelAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
}));

describe("BiometricService — SecureStore migration", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let service: any;
  let SecureStore: typeof import("expo-secure-store");
  let AsyncStorage: typeof import("@react-native-async-storage/async-storage")["default"];
  let LocalAuthentication: typeof import("expo-local-authentication");

  beforeEach(() => {
    // The global jest.setup.js already mocks SecureStore and AsyncStorage.
    // Grab references after each reset so we can configure per-test behaviour.
    SecureStore = require("expo-secure-store");
    AsyncStorage = require("@react-native-async-storage/async-storage");
    LocalAuthentication = require("expo-local-authentication");
    service = require("../biometricService").biometricService;

    // resetMocks:true clears return values — restore defaults needed by most tests
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([1]);
    (LocalAuthentication.getEnrolledLevelAsync as jest.Mock).mockResolvedValue(2);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  // ------- isBiometricEnabled -------

  describe("isBiometricEnabled", () => {
    it("reads the enabled flag from SecureStore, not AsyncStorage", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("true");

      const result = await service.isBiometricEnabled();

      expect(result).toBe(true);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(NEW_SECURE_KEY);
      // Must NOT fall through to AsyncStorage when SecureStore has a value
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it("returns false when SecureStore returns null and AsyncStorage is also empty", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await service.isBiometricEnabled();

      expect(result).toBe(false);
    });

    it("migrates an existing AsyncStorage value to SecureStore on first read (read-fallback)", async () => {
      // SecureStore has no value yet (first run after migration)
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      // Old AsyncStorage key has a value (existing user before migration)
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const result = await service.isBiometricEnabled();

      // Returns the migrated value
      expect(result).toBe(true);
      // Copies to SecureStore
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        NEW_SECURE_KEY,
        "true",
      );
      // Deletes the old AsyncStorage key so migration only happens once
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(OLD_ASYNC_KEY);
    });

    it("migrates 'false' value from AsyncStorage to SecureStore", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("false");
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const result = await service.isBiometricEnabled();

      expect(result).toBe(false);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        NEW_SECURE_KEY,
        "false",
      );
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(OLD_ASYNC_KEY);
    });

    it("returns false when SecureStore returns 'false'", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("false");

      const result = await service.isBiometricEnabled();

      expect(result).toBe(false);
    });

    it("returns false on SecureStore error", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error("SecureStore unavailable"),
      );

      const result = await service.isBiometricEnabled();

      expect(result).toBe(false);
    });
  });

  // ------- setBiometricEnabled -------

  describe("setBiometricEnabled", () => {
    it("writes the enabled flag to SecureStore, not AsyncStorage, when disabling", async () => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await service.setBiometricEnabled(false);

      expect(result).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        NEW_SECURE_KEY,
        "false",
      );
      // Must NOT write to the old AsyncStorage key
      expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
        OLD_ASYNC_KEY,
        expect.any(String),
      );
    });

    it("writes biometric type to SecureStore when enabling (after auth succeeds)", async () => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      // enabling=true triggers authenticate() first; LocalAuthentication mock returns success
      const result = await service.setBiometricEnabled(true);

      expect(result).toBe(true);
      // The enabled flag uses the new key
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        NEW_SECURE_KEY,
        "true",
      );
      // The type flag also uses a new normalised key
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        NEW_SECURE_TYPE_KEY,
        expect.any(String),
      );
    });

    it("does not write to AsyncStorage when disabling", async () => {
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await service.setBiometricEnabled(false);

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it("returns false on SecureStore write error", async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
        new Error("write failed"),
      );

      const result = await service.setBiometricEnabled(false);

      expect(result).toBe(false);
    });
  });

  // ------- storage key normalisation -------

  describe("storage key normalisation", () => {
    it("uses the normalised @fynvita/biometric/enabled key in SecureStore", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await service.isBiometricEnabled();

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
        "@fynvita/biometric/enabled",
      );
    });

    it("checks old key @fynvita_biometric_enabled in AsyncStorage during fallback", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await service.isBiometricEnabled();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        "@fynvita_biometric_enabled",
      );
    });
  });
});
