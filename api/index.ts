export default async function (req: any, res: any) {
    try {
        const { default: app } = await import('../backend/src/index.js');
        return app(req, res);
    } catch (error) {
        console.error('SERVERLESS_PROXY_ERROR:', error);
        res.status(500).json({
            error: 'Backend failed to load',
            details: (error as Error).message,
            stack: (error as Error).stack
        });
    }
}
