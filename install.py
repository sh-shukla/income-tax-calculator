#!/usr/bin/env python3
import subprocess
import sys
import os
from pathlib import Path

def create_virtual_environment():
    print("Creating virtual environment...")
    subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)

def install_requirements():
    print("Installing requirements...")
    pip_path = "venv/Scripts/pip.exe" if sys.platform == "win32" else "venv/bin/pip"
    subprocess.run([pip_path, "install", "-r", "requirements.txt"], check=True)

def create_launcher():
    if sys.platform != "win32":
        print("Creating launcher script...")
        launcher = Path("tax-calculator")
        launcher.write_text("""#!/bin/bash
source venv/bin/activate
python new_regime_calculator.py
""")
        launcher.chmod(0o755)
    else:
        print("Creating Windows launcher...")
        launcher = Path("tax-calculator.bat")
        launcher.write_text("""@echo off
call venv\\Scripts\\activate.bat
python new_regime_calculator.py
pause
""")

def main():
    try:
        create_virtual_environment()
        install_requirements()
        create_launcher()
        print("\n✅ Installation complete!")
        print("\nTo run the tax calculator:")
        if sys.platform == "win32":
            print("Double-click tax-calculator.bat or run it from command prompt")
        else:
            print("./tax-calculator")
    except Exception as e:
        print(f"\n❌ Error during installation: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()