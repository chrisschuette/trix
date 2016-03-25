var gulp = require('gulp');
var closureCompiler = require('gulp-closure-compiler');
var child_process = require('child_process');
var shell = require('gulp-shell')

gulp.task('exec-tests', shell.task([
  'npm test',
]));

gulp.task('autotest', ['exec-tests'], function() {
  gulp.watch(['test/**/*.js', 'src/**/*.js'], ['exec-tests']);
});

gulp.task('docs', function(done) {
    child_process.exec('jsdoc -c jsdoc.json src', undefined, done);
});

gulp.task('default', ['docs']);
