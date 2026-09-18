/** Read an environment variable, treating an empty value as absent. */
export const env = (name: string): string | undefined => process.env[name] || undefined
