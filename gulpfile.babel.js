const gulp = require('gulp');
const $ = require('gulp-load-plugins')();

$.merge = require('merge-stream');

function wrap(stream) {
    stream.on('error', (error) => {
        $.util.log($.util.colors.red(error.message));
        $.util.log(error.stack);
        $.util.log($.util.colors.yellow('[aborting]'));
        stream.end();
    });
    return stream;
}

gulp.task('transpile', () => gulp.src('./src/**/*.js')
    .pipe($.sourcemaps.init())
    .pipe(wrap($.babel({
        presets: ['es2015-without-strict', 'stage-1'],
        plugins: [
            'transform-decorators-legacy'
        ]
    })))
    .pipe($.sourcemaps.write(''))
    .pipe(gulp.dest('./dist/'))
);


gulp.task('test', ['transpile'], () => gulp.src('./dist/test/*.js', { read: false })
    .pipe($.mocha({ reporter: 'spec' }))
);

gulp.task('watch', ['test'], () => gulp.watch('./src/**/*.js', ['test']));
