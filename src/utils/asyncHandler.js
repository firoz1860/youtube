
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next());
  };
};

export { asyncHandler };







// const asyncHandler = ()=>{}
// const asyncHandler = (fucn)=>()=>{}; // SyntaxError: Unexpected token '=>'
// const asyncHandler = (fucn)=>{()=>{}}; // SyntaxError: Unexpected token '=>'

// const asyncHandler = (fucn) => (req, res, next) => {
//   try {

//   } catch (error) {
//     res.status(error.code || 500).json({
//       success: false,
//       message: error.message || "Internal server error",
//      });
//   }
// }
