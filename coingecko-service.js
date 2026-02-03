// CoinGecko API Service for Profit Pulse
// Handles cryptocurrency data fetching and management

class CoinGeckoService {
    constructor() {
        this.baseURL = 'https://api.coingecko.com/api/v3';
        this.coinList = [];
        this.coinCache = new Map();
        this.priceCache = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes cache

        // Rate limiting
        this.lastRequest = 0;
        this.requestDelay = 1000; // 1 second between requests for free tier
    }

    // Rate limiting helper
    async rateLimitedFetch(url, options = {}) {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequest;

        if (timeSinceLastRequest < this.requestDelay) {
            await new Promise(resolve =>
                setTimeout(resolve, this.requestDelay - timeSinceLastRequest)
            );
        }

        this.lastRequest = Date.now();
        return fetch(url, options);
    }

    // Fetch the list of all cryptocurrencies
    async fetchCoinList() {
        try {
            // Check cache first
            const cachedData = this.coinCache.get('coinList');
            if (cachedData && Date.now() - cachedData.timestamp < this.cacheDuration) {
                this.coinList = cachedData.data;
                return this.coinList;
            }

            const response = await this.rateLimitedFetch(`${this.baseURL}/coins/list`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            const majorCoins = [
                'bitcoin', 'ethereum', 'tether', 'bnb', 'solana', 'xrp', 'usd-coin', 'staked-ether', 'cardano', 'dogecoin',
                'avalanche-2', 'tron', 'chainlink', 'polygon-ecosystem-token', 'wrapped-bitcoin', 'bitcoin-cash', 'near', 'uniswap', 'internet-computer', 'litecoin',
                'leo-token', 'dai', 'pepe', 'kaspa', 'ethereum-classic',
                'monero', 'stellar', 'okb', 'cosmos', 'arbitrum', 'vechain', 'filecoin', 'maker', 'hedera-hashgraph', 'optimism',
                'injective-protocol', 'lido-dao', 'immutable-x', 'fantom', 'mantle', 'aptos', 'cronos', 'atom', 'algorand', 'thorchain',
                'sei-network', 'the-sandbox', 'render-token', 'bitcoin-sv', 'blockstack',
                'flow', 'aave', 'quant-network', 'decentraland', 'elrond-erd-2', 'axie-infinity', 'theta-token', 'tezos', 'bitget-token',
                'kucoin-shares', 'neo', 'iota', 'chiliz', 'eos', 'pancakeswap-token', 'compound-governance-token',
                'celsius-degree-token', 'helium', 'the-graph', 'curve-dao-token', 'synthetix-network-token', 'zcash', 'mina-protocol',
                'dash', 'yearn-finance', 'basic-attention-token', '1inch', 'sushi', 'gala', 'enjincoin', 'loopring', 'amp-token',
                'waves', 'zilliqa', 'havven', 'ftx-token', 'omisego', 'qtum', 'decred', 'ravencoin', 'nano', 'icon', 'ontology',
                'verge', 'digibyte', 'bitcoin-gold', 'wax', 'chain-2', 'harmony', 'celo', 'bancor', 'republic-protocol', 'storj',
                'balancer', 'convex-finance', 'rocket-pool', 'frax', 'gmx', 'looksrare', 'olympus', 'tokenlon', 'marinade',
                'radix', 'kava', 'secret', 'osmosis', 'terra-luna-2', 'anchor-protocol', 'mirror-protocol',
                'biswap', 'mdex', 'quickswap', 'honeyswap', 'spookyswap', 'traderjoe', 'platypus-finance', 'pudgy-penguins'
            ];

            // Separate major coins from others to guarantee major coins are included
            const majorCoinsList = data.filter(coin => majorCoins.includes(coin.id));
            const otherCoins = data.filter(coin =>
                !majorCoins.includes(coin.id) &&
                coin.name.length < 50 &&
                coin.name.length >= 2
            );

            // Sort each group alphabetically
            const sortedMajor = majorCoinsList.sort((a, b) => a.name.localeCompare(b.name));
            const sortedOthers = otherCoins.sort((a, b) => a.name.localeCompare(b.name));

            // Combine: major coins first, then others, then slice to limit performance
            // This guarantees all major coins are included if they exist in the API response
            this.coinList = [...sortedMajor, ...sortedOthers].slice(0, 200);

            // Cache the result
            this.coinCache.set('coinList', {
                data: this.coinList,
                timestamp: Date.now()
            });

            return this.coinList;
        } catch (error) {
            console.error('Error fetching coin list:', error);
            throw new Error('Failed to load cryptocurrency list. Please check your internet connection.');
        }
    }

    // Fetch current price for a specific coin
    async fetchCoinPrice(coinId) {
        try {
            // Check cache first
            const cacheKey = `price_${coinId}`;
            const cachedPrice = this.priceCache.get(cacheKey);
            if (cachedPrice && Date.now() - cachedPrice.timestamp < 30000) { // 30 second cache for prices
                return cachedPrice.data;
            }

            const response = await this.rateLimitedFetch(
                `${this.baseURL}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data[coinId]) {
                throw new Error('Coin price not found');
            }

            const priceData = {
                price: data[coinId].usd,
                change24h: data[coinId].usd_24h_change || 0
            };

            // Cache the result
            this.priceCache.set(cacheKey, {
                data: priceData,
                timestamp: Date.now()
            });

            return priceData;
        } catch (error) {
            console.error('Error fetching coin price:', error);
            throw new Error('Failed to load coin price. Please try again.');
        }
    }

    // Search coins by symbol or name
    searchCoins(query) {
        if (!query || query.length < 1) {
            return this.coinList.slice(0, 20); // Return top 20 coins if no query
        }

        const searchTerm = query.toLowerCase();

        return this.coinList.filter(coin => {
            return coin.symbol.toLowerCase().includes(searchTerm) ||
                coin.name.toLowerCase().includes(searchTerm) ||
                coin.id.toLowerCase().includes(searchTerm);
        }).slice(0, 50); // Limit results for performance
    }

    // Get coin by ID
    getCoinById(id) {
        return this.coinList.find(coin => coin.id === id);
    }

    // Clear caches (useful for manual refresh)
    clearCache() {
        this.coinCache.clear();
        this.priceCache.clear();
    }
}

// Cryptocurrency Dropdown Component
class CryptocurrencyDropdown {
    constructor(containerId, onCoinSelect) {
        this.container = document.getElementById(containerId);
        this.onCoinSelect = onCoinSelect;
        this.coinGeckoService = new CoinGeckoService();
        this.isOpen = false;
        this.selectedCoin = null;
        this.filteredCoins = [];
        this.highlightedIndex = -1;

        this.initializeElements();
        this.bindEvents();
        this.loadCoins();
    }

    initializeElements() {
        this.dropdownSelected = document.getElementById('dropdown-selected');
        this.dropdownContent = document.getElementById('dropdown-content');
        this.searchInput = document.getElementById('coin-search');
        this.optionsContainer = document.getElementById('dropdown-options');
        this.loadingMessage = document.getElementById('loading-message');
        this.selectedCoinElement = document.getElementById('selected-coin');
    }

    bindEvents() {
        // Toggle dropdown
        this.dropdownSelected.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Search input
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Prevent dropdown from closing when clicking inside
        this.dropdownContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    async loadCoins() {
        try {
            await this.coinGeckoService.fetchCoinList();
            this.filteredCoins = this.coinGeckoService.searchCoins('');
            this.hideLoading();
            this.renderOptions();
        } catch (error) {
            this.showError(error.message);
        }
    }

    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        this.isOpen = true;
        this.dropdownSelected.classList.add('active');
        this.dropdownContent.classList.add('open');
        this.searchInput.focus();
        this.highlightedIndex = -1;
    }

    closeDropdown() {
        this.isOpen = false;
        this.dropdownSelected.classList.remove('active');
        this.dropdownContent.classList.remove('open');
        this.searchInput.value = '';
        this.filteredCoins = this.coinGeckoService.searchCoins('');
        this.renderOptions();
        this.highlightedIndex = -1;
    }

    handleSearch(query) {
        this.filteredCoins = this.coinGeckoService.searchCoins(query);
        this.renderOptions();
        this.highlightedIndex = -1;

        if (this.filteredCoins.length === 0 && query) {
            this.showNoResults();
        }
    }

    handleKeyNavigation(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.highlightNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.highlightPrevious();
                break;
            case 'Enter':
                e.preventDefault();
                if (this.highlightedIndex >= 0) {
                    this.selectCoin(this.filteredCoins[this.highlightedIndex]);
                }
                break;
            case 'Escape':
                this.closeDropdown();
                break;
        }
    }

    highlightNext() {
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filteredCoins.length - 1);
        this.updateHighlight();
    }

    highlightPrevious() {
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
        this.updateHighlight();
    }

    updateHighlight() {
        const options = this.optionsContainer.querySelectorAll('.dropdown-option');
        options.forEach((option, index) => {
            option.classList.toggle('highlighted', index === this.highlightedIndex);
        });

        // Scroll highlighted option into view
        if (this.highlightedIndex >= 0) {
            const highlightedOption = options[this.highlightedIndex];
            if (highlightedOption) {
                highlightedOption.scrollIntoView({ block: 'nearest' });
            }
        }
    }

    async selectCoin(coin) {
        this.selectedCoin = coin;
        this.updateSelectedDisplay(coin);
        this.closeDropdown();

        // Fetch current price
        try {
            const priceData = await this.coinGeckoService.fetchCoinPrice(coin.id);
            if (this.onCoinSelect) {
                this.onCoinSelect(coin, priceData);
            }
        } catch (error) {
            console.error('Error fetching coin price:', error);
            // Still call the callback but without price data
            if (this.onCoinSelect) {
                this.onCoinSelect(coin, null);
            }
        }
    }

    updateSelectedDisplay(coin) {
        const symbolElement = this.selectedCoinElement.querySelector('.coin-symbol');
        const nameElement = this.selectedCoinElement.querySelector('.coin-name');

        symbolElement.textContent = coin.symbol.toUpperCase();
        nameElement.textContent = coin.name;
    }

    renderOptions() {
        if (this.filteredCoins.length === 0) {
            return;
        }

        this.optionsContainer.innerHTML = '';

        this.filteredCoins.forEach((coin, index) => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.innerHTML = `
                <div class="option-info">
                    <span class="option-symbol">${coin.symbol.toUpperCase()}</span>
                    <span class="option-name">${coin.name}</span>
                </div>
            `;

            option.addEventListener('click', () => {
                this.selectCoin(coin);
            });

            option.addEventListener('mouseenter', () => {
                this.highlightedIndex = index;
                this.updateHighlight();
            });

            this.optionsContainer.appendChild(option);
        });
    }

    hideLoading() {
        if (this.loadingMessage) {
            this.loadingMessage.style.display = 'none';
        }
    }

    showError(message) {
        this.optionsContainer.innerHTML = `
            <div class="error-message">
                <span>⚠️ ${message}</span>
            </div>
        `;
        this.hideLoading();
    }

    showNoResults() {
        this.optionsContainer.innerHTML = `
            <div class="no-results">
                No cryptocurrencies found
            </div>
        `;
    }

    // Public method to get selected coin
    getSelectedCoin() {
        return this.selectedCoin;
    }

    // Public method to reset selection
    reset() {
        this.selectedCoin = null;
        const symbolElement = this.selectedCoinElement.querySelector('.coin-symbol');
        const nameElement = this.selectedCoinElement.querySelector('.coin-name');

        symbolElement.textContent = 'Select coin...';
        nameElement.textContent = '';

        this.closeDropdown();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CoinGeckoService, CryptocurrencyDropdown };
}