export function* measureExecutionTime() {
  const startTime = performance.now();

  // Use the yield keyword to pause execution and wait for the execution of the external code block
  yield;

  const endTime = performance.now();
  console.log(`Execution time: ${endTime - startTime} milliseconds`);
}
