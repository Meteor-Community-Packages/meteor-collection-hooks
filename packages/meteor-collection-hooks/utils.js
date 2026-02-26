/**
 * Shared utility functions for collection-hooks
 */

/**
 * Checks if an array is empty or not an array
 * @param {any} a - The value to check
 * @returns {boolean} True if not an array or empty array
 */
export const isEmpty = (a) => !Array.isArray(a) || !a.length
