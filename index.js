'use strict';

var path = require('path');
var gutil = require('gulp-util');
var through = require('through2');
var Checker = require('jscs');
var loadConfigFile = require('jscs/lib/cli-config');

function resolveReporter(reporter) {
    if (!reporter) reporter = 'console';

    if (typeof reporter == 'function') {
        return reporter;
    }
    if (reporter.indexOf('/') == -1) {
        return require('jscs/lib/reporters/' + reporter);
    }

    return require(reporter);
}

function reporter(name) {
    var report = resolveReporter(name);
    var errorsCollection = [];

    return through.obj(function(file, enc, done) {
        if (file.jscs && !file.jscs.success) {
            errorsCollection.push(file.jscs.errors);
        }
        done(null, file);
    }, function(cb) {
        report(errorsCollection);
        cb();
    });
}

module.exports = function (configPath) {
    var checker = new Checker();

    checker.registerDefaultRules();
    checker.configure(loadConfigFile.load(configPath));

    return through.obj(function (file, enc, cb) {
        if (file.isNull()) return cb(null, file);

        if (file.isStream()) {
            return cb(new gutil.PluginError('gulp-jscs', 'Streaming not supported'));
        }

        var relativePath = path.relative(process.cwd(), file.path);

        var errors;
        try {
            errors = checker.checkString(file.contents.toString(), relativePath);
        } catch (err) {
            return cb(new gutil.PluginError('gulp-jscs', err.message.replace('null:', relativePath + ':')));
        }
        file.jscs = {
            success: errors.isEmpty(),
            errors: errors
        };
        cb(null, file);
    });
};

module.exports.reporter = reporter;
