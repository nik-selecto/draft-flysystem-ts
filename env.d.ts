declare global {
    namespace NodeJS {
        interface ProcessEnv {
            DBX_ACCESS: string,
            HOME?: string,
        }
    }
}

export { }