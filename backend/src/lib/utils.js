import jwt from "jsonwebtoken"

export const generateTokenAndSetCookie = async (userId, res)=>{
    const token = jwt.sign({userId}, process.env.JWT_SECRET, {
        expiresIn: "7d"
    });

    res.cookie("jwt",token,{
        maxAge: 7*24*3600*1000,
        httpOnly: true, //prevents XSS attacks
        sameSite: "strict",
        secure: process.env.NODE_ENV !== "development"
    });

    return token;
}