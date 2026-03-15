# 小兔快跑 - Android WebView 应用

## 快速开始

### 1. 环境准备
- 安装 Android Studio: https://developer.android.com/studio
- 安装 JDK 17+
- 配置 ANDROID_HOME 环境变量

### 2. 项目结构
```
app/
├── src/main/
│   ├── java/com/xiaotu/stock/
│   │   └── MainActivity.java
│   ├── res/
│   │   ├── layout/
│   │   │   └── activity_main.xml
│   │   ├── values/
│   │   │   └── strings.xml
│   │   └── mipmap-*/
│   │       └── ic_launcher.png
│   └── AndroidManifest.xml
├── build.gradle
└── proguard-rules.pro
```

### 3. 修改配置
编辑 `MainActivity.java`，将 URL 改为你的 H5 地址：
```java
private static final String APP_URL = "https://your-domain.com";
```

### 4. 打包步骤
1. 用 Android Studio 打开项目
2. Build → Generate Signed Bundle/APK
3. 选择 APK
4. 创建或选择签名证书
5. 选择 release 模式
6. 等待构建完成

### 5. APK 位置
构建完成后 APK 位于：
```
app/release/app-release.apk
```

## 注意事项

1. **网络权限**：已添加 `INTERNET` 权限
2. **HTTPS**：生产环境建议使用 HTTPS
3. **签名**：发布到应用商店需要正式签名证书
4. **版本号**：修改 `build.gradle` 中的 versionCode 和 versionName

## 一键打包脚本

如果你有 Android SDK 环境，可以运行：
```bash
./gradlew assembleRelease
```
