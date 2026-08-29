interface MaskEmailAddressInput {
  email: string;
}

export const maskEmailAddress = ({ email }: MaskEmailAddressInput): string => {
  const separatorIndex = email.lastIndexOf('@');

  if (separatorIndex < 1 || separatorIndex === email.length - 1) {
    return '***';
  }

  const localPart = email.slice(0, separatorIndex);
  const domain = email.slice(separatorIndex + 1);
  const visibleLength = Math.min(2, localPart.length - 1);
  const visiblePrefix = localPart.slice(0, visibleLength);

  return `${visiblePrefix}***@${domain}`;
};
