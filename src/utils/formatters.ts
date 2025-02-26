// src/utils/formatters.ts

/**
 * Formats a number to millions with 2 decimal places
 * @param value - The number to format
 * @returns Formatted string with 'M' suffix
 */
function formatMillions(value: number): string {
    return (value / 1000000).toFixed(2) + 'M';
}

/**
 * Formats a date to the Taiwanese locale format
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('zh-TW');
}

/**
 * Formats a number as TWD currency
 * @param value - The number to format
 * @returns Formatted currency string
 */
function formatCurrency(value: number): string {
    return new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

/**
 * Formats a number as a percentage
 * @param value - The number to format (expected as a value between 0-100)
 * @returns Formatted percentage string
 */
function formatPercent(value: number): string {
    return new Intl.NumberFormat('zh-TW', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value / 100);
}

// Export all formatters as a single object
export const formatters = {
    formatMillions,
    formatDate,
    formatCurrency,
    formatPercent
};

// Also export individual functions for direct imports
export {
    formatMillions,
    formatDate,
    formatCurrency,
    formatPercent
};
