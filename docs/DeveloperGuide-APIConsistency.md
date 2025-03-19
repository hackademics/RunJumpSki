# Developer Guide: Maintaining API Consistency

This guide provides practical steps for maintaining API consistency when working on RunJumpSki codebase.

## Before You Start Coding

1. **Review the API Consistency Guidelines**
   - Read [API Consistency Guidelines](./ApiConsistency.md) to understand our conventions
   - Pay special attention to method naming and option object patterns

2. **Check Existing Code**
   - Look at related components to understand existing patterns
   - Use similar APIs as a reference for your new code

## When Writing New Code

### Creating New Classes

1. **Use Proper File Structure**
   - Place interfaces in separate files (e.g., `IMeshComponent.ts` and `MeshComponent.ts`)
   - Follow existing directory structure

2. **Follow Naming Conventions**
   - Classes: PascalCase (e.g., `TransformComponent`)
   - Interfaces: PascalCase with 'I' prefix (e.g., `ITransformComponent`)
   - Options interfaces: ClassName + "Options" (e.g., `TransformComponentOptions`)
   - Default options constants: DEFAULT_CLASSNAME_OPTIONS (e.g., `DEFAULT_TRANSFORMCOMPONENT_OPTIONS`)

3. **Structure Your API**
   - Expose only what's necessary in interfaces
   - Use the correct access modifiers (`public`, `protected`, `private`)
   - Document all public methods with JSDoc

### Creating Methods

1. **Use the Right Verb Prefixes**
   - `get` for retrieving values
   - `set` for updating values
   - `is` for boolean checks
   - `create` for factory methods
   - `initialize` for setup (not `init`)
   - `dispose` for cleanup (not `destroy`)

2. **Order Parameters Consistently**
   - Required parameters first
   - Optional parameters next
   - Context parameters after specific parameters
   - Callback parameters at the end

3. **Document Your Methods**
   - Add JSDoc comments for all public methods
   - Include `@param` tags for all parameters
   - Include `@returns` tag for return values
   - Include `@throws` tag for potential exceptions

### Working with Options

1. **Create Proper Options Interfaces**
   ```typescript
   export interface MyComponentOptions {
     /** Required option with documentation */
     requiredOption: string;
     /** Optional option with documentation */
     optionalOption?: number;
   }
   ```

2. **Define Default Options**
   ```typescript
   export const DEFAULT_MYCOMPONENT_OPTIONS: MyComponentOptions = {
     requiredOption: 'default',
     optionalOption: 42
   };
   ```

3. **Merge Options Correctly**
   ```typescript
   import { OptionsUtil } from '../utils/OptionsUtil';
   
   // For simple options
   const mergedOptions = { ...DEFAULT_MYCOMPONENT_OPTIONS, ...options };
   
   // For nested options
   const mergedOptions = OptionsUtil.mergeWithDefaults(
     DEFAULT_MYCOMPONENT_OPTIONS, 
     options
   );
   ```

4. **Validate Options**
   ```typescript
   OptionsUtil.validateOptions(mergedOptions, [
     OptionsUtil.createRule('requiredOption', { 
       required: true,
       message: 'requiredOption must be provided'
     }),
     OptionsUtil.createRule('optionalOption', {
       validate: OptionsUtil.numberRange(0, 100),
       message: 'optionalOption must be between 0 and 100'
     })
   ]);
   ```

## Checking Your Code

1. **Run API Consistency Analysis**
   ```bash
   pwsh -File scripts/analyze-api-consistency.ps1 -verbose
   ```

2. **Check ESLint Errors**
   ```bash
   npx eslint --config .eslintrc.js --plugin ./scripts/eslint-api-consistency.js src/path/to/your/file.ts
   ```

3. **Ask Yourself**:
   - Are my method names consistent with the rest of the codebase?
   - Is my class API clearly defined with interfaces?
   - Are my public methods properly documented?
   - Are option objects properly structured and validated?

## Updating Existing Code

When updating existing code that doesn't follow our conventions:

1. **Gradual Migration**
   - Add new methods following conventions
   - Mark inconsistent methods as deprecated when possible
   - Document migration path

2. **Refactoring**
   - Create issues for larger refactoring needs
   - Update one component at a time
   - Add tests before refactoring

## Common Mistakes to Avoid

1. **Inconsistent Method Names**
   - Using `init()` instead of `initialize()`
   - Using `destroy()` instead of `dispose()`
   - Mixing naming styles within a single class

2. **Poor Option Handling**
   - Not providing default options
   - Not validating required options
   - Using shallow merge for nested options

3. **Access Modifier Issues**
   - Making methods public that should be private
   - Using private for methods that need to be overridden
   - Not documenting public methods

4. **Interface Problems**
   - Not defining interfaces for public APIs
   - Including implementation details in interfaces
   - Not keeping interfaces up to date with implementations

## Need Help?

- Review the [API Consistency Guidelines](./ApiConsistency.md)
- Check example implementations in the core components
- Ask for a code review before merging 