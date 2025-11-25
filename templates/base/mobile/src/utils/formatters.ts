/**
 * Format date strings for display
 */
export const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    return date.toLocaleDateString(undefined, options || defaultOptions);
  } catch (error) {
    return dateString; // Return original if formatting fails
  }
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = (now.getTime() - date.getTime()) / 1000;

    if (diffInSeconds < 60) {
      return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }

    // For longer periods, show the actual date
    return formatDate(dateString);
  } catch (error) {
    return dateString;
  }
};

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (str: string): string => {
  return str.replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * Format email for display (hide middle part)
 */
export const formatEmailForDisplay = (email: string): string => {
  const [localPart, domain] = email.split('@');
  if (!domain) return email;

  if (localPart.length <= 2) return email;

  const visibleChars = Math.max(1, Math.floor(localPart.length * 0.3));
  const hiddenPart = '*'.repeat(localPart.length - visibleChars * 2);
  const maskedLocal = localPart.slice(0, visibleChars) + hiddenPart + localPart.slice(-visibleChars);
  
  return `${maskedLocal}@${domain}`;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Format name for display
 */
export const formatDisplayName = (name: string): string => {
  return capitalizeWords(name.trim());
};