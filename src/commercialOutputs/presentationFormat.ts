export const formatCommercialOutputTimestampUtc = (isoTimestamp: string) => {
  const normalized = new Date(isoTimestamp).toISOString();
  return `${normalized.slice(0, 10)} ${normalized.slice(11, 16)} UTC`;
};
