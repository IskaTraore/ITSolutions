const { Errors } = require("../lib/errors");

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      return next(Errors.validation(details));
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
