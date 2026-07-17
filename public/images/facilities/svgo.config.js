export default {
    plugins: [
        {
            name: 'preset-default',
            params: {
                overrides: {
                    // customize default plugin options
                    inlineStyles: {
                        onlyMatchedOnce: false,
                    },
                },
            },
        },
    ],
};
