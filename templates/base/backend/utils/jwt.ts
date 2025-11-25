import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-here-change-in-production";

const signToken = (
  payload: string | object | Buffer,
  options?: jwt.SignOptions | undefined
) => {
  return jwt.sign(payload, JWT_SECRET, options);
}

const verifyToken = (
  token: string,
  options?: jwt.VerifyOptions & {
    complete: true;
  }
) => {
  return jwt.verify(token, JWT_SECRET, options);
}

const jwtUtils = {
  sign: signToken,
  verify: verifyToken,
}

export default jwtUtils;