// Profit Pulse - Universal Crypto Calculator
// Live calculation engine with instant updates

class CryptoCalculator {
    constructor() {
        this.selectedCoin = null;
        this.initializeElements();
        this.initializeDropdown();
        this.bindEvents();
        this.calculate(); // Initial calculation
    }

    initializeElements() {
        // Input elements (token input is now replaced by dropdown)
        this.investmentInput = document.getElementById('investment');
        this.purchasePriceInput = document.getElementById('purchase-price');
        this.targetPriceInput = document.getElementById('target-price');

        // Output elements
        this.tokensOwnedOutput = document.getElementById('tokens-owned');
        this.profitLossOutput = document.getElementById('profit-loss');
        this.totalValueOutput = document.getElementById('total-value');

        // Store references for animations
        this.outputElements = [
            this.tokensOwnedOutput,
            this.profitLossOutput,
            this.totalValueOutput
        ];
    }

    initializeDropdown() {
        // Initialize cryptocurrency dropdown
        this.cryptoDropdown = new CryptocurrencyDropdown('coin-dropdown', (coin, priceData) => {
            this.handleCoinSelection(coin, priceData);
        });
    }

    handleCoinSelection(coin, priceData) {
        this.selectedCoin = coin;
        
        // Auto-populate the purchase price if available
        if (priceData && priceData.price) {
            this.purchasePriceInput.value = priceData.price.toFixed(6);
            
            // Add visual feedback that price was updated
            this.purchasePriceInput.classList.add('updating');
            setTimeout(() => {
                this.purchasePriceInput.classList.remove('updating');
            }, 500);
        }
        
        // Trigger calculation with new coin selection
        this.calculate();
    }

    bindEvents() {
        // Add event listeners to all input fields for live calculation (excluding token input)
        const inputs = [
            this.investmentInput,
            this.purchasePriceInput,
            this.targetPriceInput
        ];

        inputs.forEach(input => {
            // Multiple event types for comprehensive coverage
            input.addEventListener('input', this.handleInputChange.bind(this));
            input.addEventListener('keyup', this.handleInputChange.bind(this));
            input.addEventListener('paste', this.handleInputChange.bind(this));
            input.addEventListener('change', this.handleInputChange.bind(this));
        });
    }

    handleInputChange() {
        // Debounce rapid changes but keep it under 100ms as requested
        clearTimeout(this.calculationTimeout);
        this.calculationTimeout = setTimeout(() => {
            this.calculate();
        }, 50); // 50ms debounce for smooth performance
    }

    getInputValues() {
        return {
            coin: this.selectedCoin,
            investment: parseFloat(this.investmentInput.value) || 0,
            purchasePrice: parseFloat(this.purchasePriceInput.value) || 0,
            targetPrice: parseFloat(this.targetPriceInput.value) || 0
        };
    }

    calculate() {
        const { coin, investment, purchasePrice, targetPrice } = this.getInputValues();

        // Apply the mathematical formulas from the specification:
        // Tokens Owned = Initial Investment Amount / Initial Price per Token
        const tokensOwned = purchasePrice > 0 ? investment / purchasePrice : 0;

        // Final Value = Tokens Owned × Target Price per Token
        const finalValue = tokensOwned * targetPrice;

        // Profit/Loss = Final Value - Initial Investment Amount
        const profitLoss = finalValue - investment;

        // Update the display with animation
        this.updateDisplay(tokensOwned, finalValue, profitLoss, coin);
    }

    updateDisplay(tokensOwned, finalValue, profitLoss, coin) {
        // Add update animation class
        this.outputElements.forEach(element => {
            element.classList.add('updating');
        });

        // Format and update tokens owned with coin symbol if available
        const tokenDisplay = coin ? 
            `${this.formatTokens(tokensOwned)} ${coin.symbol.toUpperCase()}` : 
            this.formatTokens(tokensOwned);
        this.tokensOwnedOutput.textContent = tokenDisplay;

        // Format and update total value
        this.totalValueOutput.textContent = this.formatCurrency(finalValue);

        // Format and update profit/loss with color coding
        this.updateProfitLoss(profitLoss);

        // Remove animation class after a short delay
        setTimeout(() => {
            this.outputElements.forEach(element => {
                element.classList.remove('updating');
            });
        }, 150);
    }

    updateProfitLoss(profitLoss) {
        const formatted = this.formatCurrency(profitLoss, true);
        this.profitLossOutput.textContent = formatted;

        // Remove all color classes
        this.profitLossOutput.classList.remove('positive', 'negative', 'neutral');

        // Add appropriate color class based on profit/loss
        if (profitLoss > 0) {
            this.profitLossOutput.classList.add('positive');
        } else if (profitLoss < 0) {
            this.profitLossOutput.classList.add('negative');
        } else {
            this.profitLossOutput.classList.add('neutral');
        }
    }

    formatTokens(tokens) {
        if (tokens === 0) return '0';
        
        // Format tokens with appropriate precision
        if (tokens >= 1) {
            return tokens.toLocaleString('en-US', {
                maximumFractionDigits: 6,
                minimumFractionDigits: 0
            });
        } else {
            // For fractional tokens, show more decimal places
            return tokens.toLocaleString('en-US', {
                maximumFractionDigits: 8,
                minimumFractionDigits: 0
            });
        }
    }

    formatCurrency(amount, showSign = false) {
        if (amount === 0) return '$0.00';

        const sign = showSign && amount > 0 ? '+' : '';
        const absAmount = Math.abs(amount);
        
        // Format large numbers with appropriate suffixes
        if (absAmount >= 1000000000) {
            const formatted = (absAmount / 1000000000).toFixed(2);
            return `${sign}$${formatted}B`;
        } else if (absAmount >= 1000000) {
            const formatted = (absAmount / 1000000).toFixed(2);
            return `${sign}$${formatted}M`;
        } else if (absAmount >= 1000) {
            const formatted = (absAmount / 1000).toFixed(2);
            return `${sign}$${formatted}K`;
        } else {
            const formatted = absAmount.toFixed(2);
            return `${sign}$${formatted}`;
        }
    }

    // Utility method to reset all fields
    reset() {
        this.cryptoDropdown.reset();
        this.selectedCoin = null;
        this.investmentInput.value = '';
        this.purchasePriceInput.value = '';
        this.targetPriceInput.value = '';
        this.calculate();
    }

    // Method to set example values for demonstration
    async setExampleBitcoin() {
        try {
            // Find Bitcoin in the dropdown service
            const coinGeckoService = this.cryptoDropdown.coinGeckoService;
            await coinGeckoService.fetchCoinList();
            const bitcoinCoin = coinGeckoService.getCoinById('bitcoin');
            
            if (bitcoinCoin) {
                // Simulate selecting Bitcoin
                const priceData = await coinGeckoService.fetchCoinPrice('bitcoin');
                this.handleCoinSelection(bitcoinCoin, priceData);
                
                // Set example values
                this.investmentInput.value = '10000';
                this.targetPriceInput.value = '100000';
                this.calculate();
                
                // Update dropdown display
                this.cryptoDropdown.updateSelectedDisplay(bitcoinCoin);
                this.cryptoDropdown.selectedCoin = bitcoinCoin;
            }
        } catch (error) {
            console.error('Error setting Bitcoin example:', error);
            // Fallback to manual values
            this.investmentInput.value = '10000';
            this.purchasePriceInput.value = '50000';
            this.targetPriceInput.value = '100000';
            this.calculate();
        }
    }
}

// Initialize the calculator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const calculator = new CryptoCalculator();
    
    // Make calculator globally available for debugging
    window.cryptoCalculator = calculator;
    
    // Add keyboard shortcuts for power users
    document.addEventListener('keydown', (event) => {
        // Ctrl/Cmd + R to reset (prevent page refresh)
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            calculator.reset();
        }
        
        // Ctrl/Cmd + E for example values
        if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
            event.preventDefault();
            calculator.setExampleBitcoin();
        }
    });

    // Add touch support for mobile devices
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
    }

    // Performance monitoring for the 100ms requirement
    if (process.env.NODE_ENV === 'development') {
        let lastCalculation = 0;
        const originalCalculate = calculator.calculate;
        
        calculator.calculate = function() {
            const start = performance.now();
            originalCalculate.call(this);
            const end = performance.now();
            const duration = end - start;
            
            if (duration > 100) {
                console.warn(`Calculation took ${duration.toFixed(2)}ms (over 100ms threshold)`);
            }
            
            lastCalculation = end;
        };
    }
});

// Service Worker registration for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoCalculator;
}