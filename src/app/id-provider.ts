export interface IdProvider{
    subject: string;
    properties: {
        "http://schema.org/name": string; 
    }
    links: {
        rel: string;
        href: string;
    }

}