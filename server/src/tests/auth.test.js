const request = require("supertest");
const app     = require("../../src/app");

// Shared test data 
const validUser = {
  username: "testuser",
  email:    "test@example.com",
  password: "password123",
};

// Helper — registers a user and returns the access token
const registerUser = async (data = validUser) => {
  const res = await request(app)
    .post("/api/auth/register")
    .send(data);
  return res;
};

// REGISTER
describe("POST /api/auth/register", () => {

  it("should register a new user and return 201 + accessToken", async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body.user).toHaveProperty("username", "testuser");
    expect(res.body.user).toHaveProperty("email", "test@example.com");
  });

  it("should never return passwordHash in the response", async () => {
    const res = await registerUser();

    expect(res.body.user).not.toHaveProperty("passwordHash");
  });

  it("should return 400 if username is missing", async () => {
    const res = await registerUser({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(400);
  });

  it("should return 400 if password is under 8 characters", async () => {
    const res = await registerUser({ ...validUser, password: "short" });

    expect(res.status).toBe(400);
  });

  it("should return 400 if email is invalid", async () => {
    const res = await registerUser({ ...validUser, email: "not-an-email" });

    expect(res.status).toBe(400);
  });

  it("should return 409 if email is already taken", async () => {
    await registerUser();
    const res = await registerUser(); // same email second time

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/email/i);
  });

  it("should return 409 if username is already taken", async () => {
    await registerUser();
    const res = await registerUser({ ...validUser, email: "other@example.com" });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/username/i);
  });

});

// LOGIN
describe("POST /api/auth/login", () => {

  beforeEach(async () => {
    await registerUser(); // ensure a user exists before each login test
  });

  it("should login successfully and return 200 + accessToken", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
  });

  it("should return 401 for wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("should return 401 for non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: validUser.password });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("should return same error for wrong email and wrong password", async () => {
    const wrongEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: validUser.password });

    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: "wrongpassword" });

    // Identical messages — no user enumeration possible
    expect(wrongEmail.body.message).toBe(wrongPassword.body.message);
  });

});

// GET ME
describe("GET /api/auth/me", () => {

  let accessToken;

  beforeEach(async () => {
    const res   = await registerUser();
    accessToken = res.body.accessToken;
  });

  it("should return the current user when token is valid", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty("email", validUser.email);
    expect(res.body.user).not.toHaveProperty("passwordHash");
  });

  it("should return 401 when no token is provided", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
  });

  it("should return 401 when token is invalid", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer faketoken123");

    expect(res.status).toBe(401);
  });

});

// LOGOUT 
describe("POST /api/auth/logout", () => {

  let accessToken;

  beforeEach(async () => {
    const res   = await registerUser();
    accessToken = res.body.accessToken;
  });

  it("should logout successfully and clear the cookie", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out successfully");
  });

  it("should return 401 if no token provided on logout", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(401);
  });

});