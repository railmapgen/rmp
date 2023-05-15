const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = app => {
    app.get('/rmp/info.json', (req, res) => {
        res.send({
            component: 'rmp',
            version: '9.9.9',
            environment: 'DEV',
            instance: 'localhost',
        });
    });

    app.use(
        ['/rmg/'],
        createProxyMiddleware({
            target: 'https://uat-railmapgen.github.io',
            changeOrigin: true,
            secure: false,
        })
    );
    
    app.use(
        ['/rmp-gallery/'],
        createProxyMiddleware({
            target: 'https://railmapgen.github.io',
            changeOrigin: true,
            secure: false,
        })
    );
};
