export interface JwtTypeCollection {
  AccessToken: {
    userId: string;
    exp?: number;
  };
}
