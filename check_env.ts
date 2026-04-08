console.log('KEY exists:', !!process.env.KEY);
if (process.env.KEY) {
  console.log('KEY length:', process.env.KEY.length);
  console.log('KEY starts with:', process.env.KEY.substring(0, 3));
}
