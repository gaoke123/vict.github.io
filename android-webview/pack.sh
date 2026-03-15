#!/bin/bash

# 小兔快跑 APK 打包脚本
# 使用前请确保已安装 Android SDK 并配置 ANDROID_HOME 环境变量

echo "========================================="
echo "  小兔快跑 APK 打包脚本"
echo "========================================="
echo ""

# 检查 Android SDK
if [ -z "$ANDROID_HOME" ]; then
    echo "错误: ANDROID_HOME 环境变量未设置"
    echo "请先安装 Android SDK 并设置环境变量"
    echo ""
    echo "macOS/Linux 添加到 ~/.bashrc 或 ~/.zshrc:"
    echo "  export ANDROID_HOME=/path/to/Android/sdk"
    echo "  export PATH=\$PATH:\$ANDROID_HOME/tools:\$ANDROID_HOME/platform-tools"
    exit 1
fi

echo "Android SDK: $ANDROID_HOME"
echo ""

# 检查 gradlew
if [ ! -f "gradlew" ]; then
    echo "生成 Gradle Wrapper..."
    gradle wrapper
fi

# 赋予执行权限
chmod +x gradlew

echo "开始构建 APK..."
echo ""

# 清理
./gradlew clean

# 构建 Release APK
./gradlew assembleRelease

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "  构建成功!"
    echo "========================================="
    echo ""
    echo "APK 文件位置:"
    echo "  app/build/outputs/apk/release/app-release.apk"
    echo ""
    echo "文件大小: $(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)"
else
    echo ""
    echo "构建失败，请检查错误信息"
fi
