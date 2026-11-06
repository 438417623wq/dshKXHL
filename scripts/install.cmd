@echo off
rem 双击入口：装/卸 dsh-remote-link。
rem 用 `install.cmd --dry-run` 先看要改什么，`install.cmd --uninstall` 卸载。
node "%~dp0install.mjs" %*
echo.
pause
