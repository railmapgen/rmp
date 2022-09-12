module.exports = app => {
    app.get('/rmp/info.json', (req, res) => {
        res.send({
            component: 'rmp',
            version: '9.9.9',
            environment: 'DEV',
            instance: 'localhost',
        });
    });
};
