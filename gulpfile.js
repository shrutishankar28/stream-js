var gulp = require('gulp');
var uglify = require('gulp-uglify');
var pump = require('pump');

// gulp.task('default', ['compile']);
 
gulp.task('compress', function (cb) {
  pump([
        gulp.src('lib/*.js'),
        uglify(),
        gulp.dest('dist')
    ],
    cb
  );
});