# Contributor Guide

## Coding Conventions

### General Principles

- **Language:**
  All code, comments, docstrings, variable and function names must be in English.
- **Documentation:**
  Every class, function/method, and file should be fully documented (docstrings/JSDoc), including:

  - Arguments (type + description)
  - Return values
  - Exceptions (if any)

- **Comments:**
  Use inline comments for non-obvious logic only.
  All comments must be clear, concise, and in English.

---

### Formatting

| Aspect          | Python                     | JavaScript / TypeScript    |
| :-------------- | :------------------------- | :------------------------- |
| **Indentation** | 4 spaces, no tabs          | 2 spaces, no tabs          |
| **Line Length** | Prefer 88–100 chars        | Prefer 100–120 chars       |
| **Spacing**     | Blank lines between blocks | Blank lines between blocks |
| **Files**       | End files with a newline   | End files with a newline   |
| **Operators**   | Spaces around operators    | Spaces around operators    |

---

### Naming

| Element       | Python (PEP8)      | JavaScript/TypeScript               |
| ------------- | ------------------ | ----------------------------------- |
| Variables     | `snake_case`       | `camelCase`                         |
| Functions     | `snake_case`       | `camelCase`                         |
| Classes       | `CamelCase`        | `PascalCase`                        |
| Constants     | `UPPER_SNAKE_CASE` | `UPPER_SNAKE_CASE`                  |
| Interfaces    | –                  | `IPascalCase` (optional convention) |
| Types/Aliases | –                  | `PascalCase`                        |

---

### Python-specific

- Use [type hints](https://docs.python.org/3/library/typing.html) for all function arguments and return values.
- Use docstrings (`"""Summary..."""`) for all modules, classes, and functions.
- Prefer list/dict comprehensions over loops for simple cases.
- Avoid global variables.
- Use virtual environments.
- Format with [`black`](https://black.readthedocs.io/) and check with [`ruff`](https://docs.astral.sh/ruff/).
- Always run static type checks (e.g., with `mypy`).

---

### JavaScript/TypeScript-specific

- Use [JSDoc](https://jsdoc.app/) or [TSDoc](https://tsdoc.org/) for documentation.
- Always use semicolons (`;`).
- Prefer `const` and `let` over `var`.
- Use `===`/`!==` for comparison.
- For TypeScript, type everything explicitly.
- Prefer arrow functions except for class methods.
- Use ES modules (`import`/`export`) by default.
- Format with [Prettier](https://prettier.io/) and lint with [ESLint](https://eslint.org/).

---

### Example Python Function

```python
def add_numbers(a: int, b: int) -> int:
    """
    Add two integers.

    Args:
        a (int): The first integer.
        b (int): The second integer.

    Returns:
        int: The sum of a and b.
    """
    return a + b  # Simple addition
```

---

### Example TypeScript Function

```typescript
/**
 * Add two numbers together.
 *
 * @param a - The first number
 * @param b - The second number
 * @returns The sum of a and b
 */
function addNumbers(a: number, b: number): number {
  return a + b; // Simple addition
}
```

## Testing

Always test the code with:

- `npm ci`
- `npx prettier --check .`
- `npx eslint .`
- `npm test --if-present`

## Branch naming

Title in English

## PR instructions

Title format: [<project_name>] <Title>
