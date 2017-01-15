"use strict";
let request = require('request');
let url = "http://localhost:4000/jsonrpc";

let id_val = 0;
module.exports.req_id = null;
module.exports.root_dir = __dirname;

module.exports.Service = class {
    constructor() {
        // empty
    };

    shutdown() {
        return Promise.resolve(null);
    };

    preBatch() {
        return Promise.resolve(null);
    };

    postBatch() {
        return Promise.resolve(null);
    };

    preRequest() {
        return Promise.resolve(null);
    };

    postRequest() {
        return Promise.resolve(null);
    };
};

///////////////////////////////////////////////////////////////////////////////
// Runtime Lib
function make_call(method, ...params) {

    //let params = [].slice.call(arguments, 1);
    params.unshift(module.exports.req_id);

    let payload = {
        method: method,
        params: params,
        jsonrpc: '2.0',
        id: id_val
    };

    return new Promise(function(resolve, reject) {
        request({
            url: url,
            method: 'POST',
            body: payload,
            json: true
            },
            function(error, response, body) {
                if(!error && response.statusCode >= 200 && response.statusCode < 300) {
                    id_val += 1;
                    if ('result' in body) {
                        resolve(body['result']);
                    } else { reject(body['error']) }
                } else {
                    reject('error: '+ response.statusCode + error)
                }
            }
        )
    })
}

// nstack library functions
module.exports.get_nstack_user = function() {
    return make_call('get_nstack_user')
};

module.exports.get_service_author = function() {
    return make_call('get_service_author')
};

module.exports.is_author = function() {
    return make_call('is_author')
};

module.exports.put_file = function(fname, make_public) {
    let _make_public = typeof make_public !== 'undefined' ? make_public : true;
    return make_call('put_file', fname, _make_public)
};

module.exports.get_file = function(key) {
    return make_call('get_file', key)
};

module.exports.download_file = function(url, fname) {
    let _fname = typeof fname !== 'undefined' ? fname : null;
    return make_call('download_file', url, _fname)
};

module.exports.run_command = function(cmd, stdin) {
    let _stdin = typeof stdin !== 'undefined' ? stdin : '';
    return make_call('run_command', _cmd)
};
