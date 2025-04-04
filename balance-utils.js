/**
 * Balance Utilities
 * 
 * A collection of utility functions for formatting and displaying
 * token balances consistently across all pages.
 */

// Global balance formatter
window.balanceFormatter = {
  /**
   * Format a number with commas
   * @param {number} number - The number to format
   * @param {number} decimals - Number of decimal places to show
   * @returns {string} Formatted number
   */
  formatNumber(number, decimals = 2) {
    if (typeof number !== 'number' && typeof number !== 'string') {
      return '0.00';
    }
    
    // Convert to number and handle NaN
    const num = Number(number);
    if (isNaN(num)) return '0.00';
    
    // Format with the specified number of decimals
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },
  
  /**
   * Format a token balance
   * @param {number|string} balance - The balance to format
   * @param {string} token - The token symbol
   * @param {boolean} includeSymbol - Whether to include the token symbol
   * @returns {string} Formatted balance
   */
  formatBalance(balance, token = 'CIS', includeSymbol = true) {
    const formattedNumber = this.formatNumber(balance);
    return includeSymbol ? `${formattedNumber} ${token}` : formattedNumber;
  },
  
  /**
   * Format a USD value
   * @param {number|string} amount - The USD amount
   * @returns {string} Formatted USD amount
   */
  formatUSD(amount) {
    if (typeof amount !== 'number' && typeof amount !== 'string') {
      return '$0.00';
    }
    
    const num = Number(amount);
    if (isNaN(num)) return '$0.00';
    
    return `$${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  },
  
  /**
   * Format a balance change
   * @param {number|string} change - The change amount
   * @param {boolean} percentage - Whether this is a percentage change
   * @returns {string} Formatted change amount
   */
  formatChange(change, percentage = true) {
    const num = Number(change);
    if (isNaN(num)) return '0%';
    
    const prefix = num > 0 ? '+' : '';
    const suffix = percentage ? '%' : '';
    
    return `${prefix}${num.toFixed(2)}${suffix}`;
  },
  
  /**
   * Get CSS class for a balance change
   * @param {number|string} change - The change amount
   * @returns {string} CSS class name
   */
  getChangeClass(change) {
    const num = Number(change);
    if (isNaN(num)) return '';
    
    return num > 0 ? 'up' : num < 0 ? 'down' : '';
  }
};

/**
 * Update balance displays on the page
 * @param {Object} balances - Token balances object
 */
window.updateBalanceDisplays = function(balances) {
  if (!balances) return;
  
  // Total balance
  const totalBalance = (Number(balances.CIS) || 0) + (Number(balances.xCIS) || 0);
  
  // Find balance containers
  const containers = document.querySelectorAll('.balance-container');
  
  // If no custom containers found, update legacy elements
  if (containers.length === 0) {
    updateLegacyBalanceDisplays(balances);
    return;
  }
  
  // Update each container
  containers.forEach(container => {
    // CIS balance
    const cisElement = container.querySelector('.token-cis .balance-value');
    if (cisElement) {
      cisElement.textContent = window.balanceFormatter.formatBalance(balances.CIS, 'CIS', false);
    }
    
    // xCIS balance
    const xcisElement = container.querySelector('.token-xcis .balance-value');
    if (xcisElement) {
      xcisElement.textContent = window.balanceFormatter.formatBalance(balances.xCIS, 'xCIS', false);
    }
    
    // Total balance
    const totalElement = container.querySelector('.token-total .balance-value');
    if (totalElement) {
      totalElement.textContent = window.balanceFormatter.formatBalance(totalBalance, 'Total', false);
    }
  });
};

/**
 * Update legacy balance displays
 * @param {Object} balances - Token balances object
 */
function updateLegacyBalanceDisplays(balances) {
  // Update CIS balance displays
  const cisBalanceElements = document.querySelectorAll('.cis-balance, .token-balance-cis');
  cisBalanceElements.forEach(el => {
    if (el) el.textContent = window.balanceFormatter.formatBalance(balances.CIS);
  });
  
  // Update xCIS balance displays
  const xcisBalanceElements = document.querySelectorAll('.xcis-balance, .token-balance-xcis');
  xcisBalanceElements.forEach(el => {
    if (el) el.textContent = window.balanceFormatter.formatBalance(balances.xCIS, 'xCIS');
  });
  
  // Update total balance displays (CIS + xCIS)
  const totalBalance = (Number(balances.CIS) || 0) + (Number(balances.xCIS) || 0);
  const totalBalanceElements = document.querySelectorAll('.total-balance');
  totalBalanceElements.forEach(el => {
    if (el) el.textContent = window.balanceFormatter.formatBalance(totalBalance, 'COSMIC');
  });
}

/**
 * Create and render a beautiful balance widget
 * @param {Element} container - The container element
 * @param {Object} balances - Token balances object
 * @param {Object} options - Display options
 */
window.renderBalanceWidget = function(container, balances, options = {}) {
  if (!container || !balances) return;
  
  // Default options
  const defaultOptions = {
    showTotal: true,
    showUSD: true,
    showChange: true,
    showTokenIcons: true,
    // Token price estimate for USD conversion
    tokenPrice: {
      CIS: 0.15,
      xCIS: 0.18
    },
    // 24h change percentage
    tokenChange: {
      CIS: 2.5,
      xCIS: 3.8
    }
  };
  
  // Merge options
  const settings = {...defaultOptions, ...options};
  
  // Clear container
  container.innerHTML = '';
  container.classList.add('balance-container');
  
  // Calculate total balance
  const totalBalance = (Number(balances.CIS) || 0) + (Number(balances.xCIS) || 0);
  
  // Create CIS row
  const cisRow = document.createElement('div');
  cisRow.className = 'balance-row token-cis';
  cisRow.innerHTML = `
    <div class="token-name">
      ${settings.showTokenIcons ? '<img src="images/cis-token.png" alt="CIS" class="token-icon" onerror="this.style.display=\'none\'">' : ''}
      <span>CIS Token</span>
    </div>
    <div class="balance-info">
      <div class="balance-value">${window.balanceFormatter.formatBalance(balances.CIS, 'CIS', false)}</div>
      ${settings.showUSD ? `<div class="balance-usd">${window.balanceFormatter.formatUSD(balances.CIS * settings.tokenPrice.CIS)}</div>` : ''}
      ${settings.showChange ? `<span class="balance-change ${window.balanceFormatter.getChangeClass(settings.tokenChange.CIS)}">${window.balanceFormatter.formatChange(settings.tokenChange.CIS)}</span>` : ''}
    </div>
  `;
  container.appendChild(cisRow);
  
  // Create xCIS row
  const xcisRow = document.createElement('div');
  xcisRow.className = 'balance-row token-xcis';
  xcisRow.innerHTML = `
    <div class="token-name">
      ${settings.showTokenIcons ? '<img src="images/xcis-token.png" alt="xCIS" class="token-icon" onerror="this.style.display=\'none\'">' : ''}
      <span>xCIS Token</span>
    </div>
    <div class="balance-info">
      <div class="balance-value">${window.balanceFormatter.formatBalance(balances.xCIS, 'xCIS', false)}</div>
      ${settings.showUSD ? `<div class="balance-usd">${window.balanceFormatter.formatUSD(balances.xCIS * settings.tokenPrice.xCIS)}</div>` : ''}
      ${settings.showChange ? `<span class="balance-change ${window.balanceFormatter.getChangeClass(settings.tokenChange.xCIS)}">${window.balanceFormatter.formatChange(settings.tokenChange.xCIS)}</span>` : ''}
    </div>
  `;
  container.appendChild(xcisRow);
  
  // Create total row if needed
  if (settings.showTotal) {
    const totalUSDValue = (balances.CIS * settings.tokenPrice.CIS) + (balances.xCIS * settings.tokenPrice.xCIS);
    const totalRow = document.createElement('div');
    totalRow.className = 'balance-row token-total';
    totalRow.innerHTML = `
      <div class="token-name">
        <span>Total Balance</span>
      </div>
      <div class="balance-info">
        <div class="balance-value">${window.balanceFormatter.formatBalance(totalBalance, 'COSMIC', false)}</div>
        ${settings.showUSD ? `<div class="balance-usd">${window.balanceFormatter.formatUSD(totalUSDValue)}</div>` : ''}
      </div>
    `;
    container.appendChild(totalRow);
  }
}; 