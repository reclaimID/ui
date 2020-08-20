export interface Authorization{
    idProvider: string,
    attestationName: string,
    redirectUri: string,
    clientId: string,
    accessToken: string,
    idToken: string,
    logoutURL: string
}
