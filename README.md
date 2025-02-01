# 🌟 Income Tax Calculator (New Regime)

A beautiful, interactive command-line tool to calculate Indian income tax under the new tax regime. This calculator provides detailed breakdowns of your tax liability, monthly salary, and effective tax rates with a user-friendly interface.

![Python Version](https://img.shields.io/badge/python-3.6+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

- 🎨 Beautiful CLI interface with colored output
- 📊 Detailed tax breakdown with tables
- 💰 Both annual and monthly calculations
- 📈 Tax bracket visualization
- 🔄 Multiple calculations in one session
- 💸 Effective tax rate calculation
- ⚡ Fast and accurate calculations

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/sh-shukla/income-tax-calculator.git
cd income-tax-calculator
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install required packages:
```bash
pip install -r requirements.txt
```

## 💻 Usage

Simply run:
```bash
python new_regime_calculator.py
```

Or make it executable (Linux/Mac):
```bash
chmod +x new_regime_calculator.py
./new_regime_calculator.py
```

## 📊 Tax Brackets (New Regime)

| Income Range | Tax Rate |
|-------------|----------|
| Up to ₹4,00,000 | 0% |
| ₹4,00,001 - ₹8,00,000 | 5% |
| ₹8,00,001 - ₹12,00,000 | 10% |
| ₹12,00,001 - ₹16,00,000 | 15% |
| ₹16,00,001 - ₹20,00,000 | 20% |
| ₹20,00,001 - ₹24,00,000 | 25% |
| Above ₹24,00,000 | 30% |

## 📝 Requirements

- Python 3.6 or higher
- rich library (for beautiful CLI interface)

## 🛠️ Development Setup

1. Install development dependencies:
```bash
pip install -r requirements-dev.txt
```

2. Run tests:
```bash
python -m pytest tests/
```

## 📦 Project Structure

```
income-tax-calculator/
│
├── new_regime_calculator.py  # Main calculator script
├── requirements.txt         # Project dependencies
├── requirements-dev.txt    # Development dependencies
├── tests/                  # Test files
├── .gitignore             # Git ignore file
└── README.md              # Project documentation
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Rich library for beautiful CLI interface
- All contributors who help improve this calculator

## 📞 Support

If you encounter any issues or have questions, please file an issue on the [GitHub issue tracker](https://github.com/sh-shukla/income-tax-calculator/issues).