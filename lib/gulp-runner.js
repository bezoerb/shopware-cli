var gulp = require('gulp');
require('../gulp/gulpfile');

const run = taskname => {
  const registry = gulp.registry();
  const tasks = registry.tasks();
  const {[taskname]: task} = tasks;
  console.log(tasks);
  console.log(task);
  if (task) {
    console.log(`Running gulp ${taskname}`);
    const result = gulp.task(taskname)();
    return Promise.resolve(result);
  }

  return Promise.reject(new Error(`Task "${taskname}" is not defined`));
};

module.exports = {
  run,
};
