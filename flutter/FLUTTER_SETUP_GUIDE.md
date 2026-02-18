# 🚀 Flutter Setup Guide - CreditMaster Pro Mobile App

**Date**: January 7, 2025  
**Status**: Flutter Not Installed  
**Goal**: Set up Flutter and run golden tests

---

## 📋 Current Status

### **Flutter Project Structure** ✅

```
flutter/
├── domain/                          # Domain layer (entities, repositories)
│   ├── lib/
│   └── pubspec.yaml
├── modules/                         # Feature modules
│   ├── billing/
│   │   ├── test/
│   │   │   └── billing_dashboard_screen_golden_test.dart
│   │   └── pubspec.yaml
│   └── documents/
│       ├── test/
│       │   └── document_list_screen_golden_test.dart
│       └── pubspec.yaml
├── FIREBASE_SETUP.md
└── README.md
```

### **Golden Tests Found** ✅

1. `billing_dashboard_screen_golden_test.dart`
2. `document_list_screen_golden_test.dart`

### **Issue** ❌

Flutter SDK is not installed or not in PATH

---

## 🔧 Solution: Install Flutter

### **Option 1: Install via Chocolatey (Recommended)**

```powershell
# Install Chocolatey (if not already installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Flutter
choco install flutter -y

# Verify installation
flutter --version
```

### **Option 2: Install via Scoop**

```powershell
# Install Scoop (if not already installed)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Add extras bucket
scoop bucket add extras

# Install Flutter
scoop install flutter

# Verify installation
flutter --version
```

### **Option 3: Manual Installation**

1. **Download Flutter SDK**:
   - Go to https://docs.flutter.dev/get-started/install/windows
   - Download the latest stable release (Flutter 3.x)
   - Extract to `C:\flutter`

2. **Add to PATH**:

   ```powershell
   # Add Flutter to PATH (permanent)
   [Environment]::SetEnvironmentVariable(
       "Path",
       [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\flutter\bin",
       "User"
   )

   # Refresh current session
   $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
   ```

3. **Verify Installation**:
   ```powershell
   flutter --version
   flutter doctor
   ```

---

## 🏥 Flutter Doctor

After installing Flutter, run:

```powershell
flutter doctor
```

This will check for:

- ✅ Flutter SDK
- ✅ Android toolchain
- ✅ Chrome (for web development)
- ✅ Visual Studio (for Windows development)
- ✅ Android Studio / VS Code
- ✅ Connected devices

**Fix any issues** reported by `flutter doctor`.

---

## 📦 Install Dependencies

Once Flutter is installed, install project dependencies:

```powershell
# Navigate to Flutter directory
cd flutter

# Install dependencies for domain module
cd domain
flutter pub get
cd ..

# Install dependencies for billing module
cd modules/billing
flutter pub get
cd ../..

# Install dependencies for documents module
cd modules/documents
flutter pub get
cd ../..
```

---

## 🧪 Run Golden Tests

### **Update Golden Files**

```powershell
# Navigate to Flutter directory
cd flutter

# Update all golden files
flutter test --tags=golden --update-goldens

# Or update specific module
cd modules/billing
flutter test --tags=golden --update-goldens
cd ../..

cd modules/documents
flutter test --tags=golden --update-goldens
cd ../..
```

### **Run Golden Tests (Verify)**

```powershell
# Run all golden tests
flutter test --tags=golden

# Run specific test file
flutter test test/billing_dashboard_screen_golden_test.dart
```

---

## 📸 What Are Golden Tests?

Golden tests (also called snapshot tests) compare the rendered UI against a reference image:

1. **First Run**: Creates reference images (golden files)
2. **Subsequent Runs**: Compares current UI against golden files
3. **Failures**: Indicates UI has changed (intentionally or bug)

**Golden files location**: `test/goldens/`

---

## 🎯 Golden Test Commands Reference

```powershell
# Update all golden files
flutter test --tags=golden --update-goldens

# Run all golden tests
flutter test --tags=golden

# Run specific test file
flutter test test/billing_dashboard_screen_golden_test.dart

# Run all tests (including golden)
flutter test

# Run tests with coverage
flutter test --coverage

# Run tests in watch mode
flutter test --watch
```

---

## 🔍 Troubleshooting

### **Issue: Flutter command not found**

**Solution**:

```powershell
# Check if Flutter is in PATH
$env:PATH -split ';' | Select-String -Pattern 'flutter'

# If not found, add to PATH
$env:Path += ";C:\flutter\bin"

# Or restart terminal after installation
```

### **Issue: Golden test failures**

**Solution**:

```powershell
# Update golden files to match current UI
flutter test --tags=golden --update-goldens

# Then verify tests pass
flutter test --tags=golden
```

### **Issue: Dependencies not found**

**Solution**:

```powershell
# Clean and reinstall dependencies
flutter clean
flutter pub get
```

### **Issue: Android licenses not accepted**

**Solution**:

```powershell
flutter doctor --android-licenses
```

---

## 📱 Flutter Project Architecture

### **Modular Architecture**

The CreditMaster Pro Flutter app uses a modular architecture:

```
flutter/
├── domain/              # Shared domain layer
│   ├── entities/        # Business entities
│   ├── repositories/    # Repository interfaces
│   └── use_cases/       # Business logic
│
├── modules/             # Feature modules
│   ├── billing/         # Billing feature
│   │   ├── lib/
│   │   │   ├── screens/
│   │   │   ├── widgets/
│   │   │   └── providers/
│   │   └── test/
│   │
│   └── documents/       # Documents feature
│       ├── lib/
│       │   ├── screens/
│       │   ├── widgets/
│       │   └── providers/
│       └── test/
│
└── app/                 # Main app (to be created)
    ├── lib/
    │   ├── main.dart
    │   ├── app.dart
    │   └── routes/
    └── test/
```

---

## 🚀 Next Steps

### **Immediate**

1. ✅ Install Flutter SDK
2. ✅ Run `flutter doctor` and fix issues
3. ✅ Install project dependencies (`flutter pub get`)
4. ✅ Update golden files (`flutter test --tags=golden --update-goldens`)
5. ✅ Verify tests pass (`flutter test --tags=golden`)

### **Short-Term**

1. Create main Flutter app module
2. Set up navigation/routing
3. Integrate with Next.js API
4. Add authentication
5. Build remaining screens

### **Long-Term**

1. Add more golden tests
2. Set up CI/CD for Flutter
3. Publish to App Store / Play Store
4. Add offline support
5. Implement push notifications

---

## 📚 Resources

### **Flutter Documentation**

- [Flutter Installation](https://docs.flutter.dev/get-started/install/windows)
- [Golden Tests Guide](https://docs.flutter.dev/cookbook/testing/widget/golden-files)
- [Testing Best Practices](https://docs.flutter.dev/testing)

### **CreditMaster Pro Docs**

- `flutter/README.md` - Flutter project overview
- `flutter/FIREBASE_SETUP.md` - Firebase integration guide
- `COMPREHENSIVE_ENHANCEMENTS_REVIEW.md` - Full project review

---

## 🎊 Summary

**Current Status**: Flutter SDK not installed  
**Action Required**: Install Flutter SDK  
**Golden Tests**: 2 test files found  
**Next Command**: `flutter test --tags=golden --update-goldens`

Once Flutter is installed, you'll be able to:

- ✅ Run golden tests
- ✅ Update golden files
- ✅ Build Flutter app
- ✅ Run on emulator/device

---

**Need Help?**

1. Check `flutter doctor` output
2. Review Flutter installation docs
3. Ask for assistance with specific errors

**Ready to build an amazing mobile app!** 🚀
