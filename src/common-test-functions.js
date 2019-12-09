const path = require('path');
const ejs = require('ejs');
const fs = require('fs');
const { TypescriptParser } = require('typescript-parser');
const { MyTypescriptParser } = require('./typescript-parser');

const Util = require('./util.js');
/*
................ { getKlassImports:
   { Component: { mport: [NamedImport], specifier: [SymbolSpecifier] },
     OnInit: { mport: [NamedImport], specifier: [SymbolSpecifier] },
     Inject: { mport: [NamedImport], specifier: [SymbolSpecifier] },
     PLATFORM_ID: { mport: [NamedImport], specifier: [SymbolSpecifier] },
     ViewChild: { mport: [NamedImport], specifier: [SymbolSpecifier] },
     ElementRef: { mport: [NamedImport], specifier: [SymbolSpecifier] },
     isPlatformBrowser: { mport: [NamedImport], specifier: [SymbolSpecifier] },
     Router: { mport: [NamedImport], specifier: [SymbolSpecifier] },
     ActivatedRoute: { mport: [NamedImport], specifier: [SymbolSpecifier] },
     NavigationEnd: { mport: [NamedImport], specifier: [SymbolSpecifier] },
     AuthGuardService: { mport: [NamedImport], specifier: [SymbolSpecifier] },
     CookieService: { mport: [NamedImport], specifier: [SymbolSpecifier] },
     AppLoadService: { mport: [NamedImport], specifier: [SymbolSpecifier] },
     CommonUtilsService: { mport: [NamedImport], specifier: [SymbolSpecifier] } } }
................ { getImports:
   { '@angular/core': [ 'Component', 'PLATFORM_ID' ],
     './example.component': [ 'ExampleComponent' ],
     './auth-guard.service': [ 'AuthGuardService' ],
     './cookie.service': [ 'CookieService' ],
     './app-load.service': [ 'AppLoadService' ],
     '@angular/router': [ 'Router' ],
     './common-utils.service': [ 'CommonUtilsService' ] } }
*/

/*
parameters
  parser.rootNode.get('ClassDeclaration').get('Constructor').node.parameters
    parameter(node): 
      start : param.node.pos
      end : param.node.end
      type : param.node.type.typeName.escapedText
      name: param.node.name.excapedText

class imports
  parser.rootNode.get('ImportDeclaration').map(prop => {
    const library = prop.node.moduleSpecifier).map(token => token.text)
    const members = prop.node.importClause.namedBindings).map(node => {
      if (node.name) { // NameSpaceImport with alias
        return {alias: node.name.escapedText};
      } else if (node.elements) { // Named import
        return node.elements.map(node => node.name.escapedText)
      }
    });
  })

Properties(Input, Output, and class variables)
  parser.rootNode.get('ClassDeclaration').get('PropertyDeclaration').map( prop => {
    if (prop.node.decorators) {
      const varName = prop.node.name.escapedText;
      const inputOutput = prop.node.decorators[0].expression.expression.escapedText;
      return {decoraator: inputOutput, name: varName};
    } else {
      const varName = prop.node.name.escapedText
      return {decoraator: undefined, name: varName};
    }
  });
*/
async function getKlass () {
  const parser = new TypescriptParser();
  const klassName = Util.getClassName(this.tsPath);
  // const srcFile = createSourceFile('inline.tsx', this.typescript, ScriptTarget.ES2015, true, ScriptKind.TS);
  // const parsed = parser['parseTypescript'](srcFile, '/');
  const parsed = await parser.parseSource(this.typescript);

  const klass =
    parsed.declarations.find(decl => decl.name === klassName) ||
    parsed.declarations.find(decl => decl.constructor.name === 'ClassDeclaration');

  if (!klass) {
    throw new Error(`Error:NgTypeScriptParser Could not find ` +
      `${this.klassName || 'a class'} from ${this.tsPath}`);
  }

  return klass;
}


function getClass() {
  const parsed = new MyTypescriptParser(this.typescript);
  const fileBasedKlassName = Util.getClassName(this.tsPath);
  
  const klassDeclarations = Array.from(parser.rootNode.get('ClassDeclaration'));
  const klass =
    klassDeclarations.find(decl => decl.node.name.escapedText === fileBasedKlassName) ||
    klassDeclarations.find(decl => decl.node.syntaxKind === 'ClassDeclaration');

  if (!klass) {
    throw new Error(`Error:NgTypeScriptParser Could not find ` +
      `${this.klassName || 'a class'} from ${this.tsPath}`);
  }

  return klass.node;
}


// all imports info. from typescript
// { Component: { mport: [NamedImport], specifier: [SymbolSpecifier] }, ... }
async function getKlassImports () {
  const imports = {};

  const parser = new TypescriptParser();
  const parsed = await parser.parseSource(this.typescript);
  // const srcFile = createSourceFile('inline.tsx', this.typescript, ScriptTarget.ES2015, true, ScriptKind.TS);
  // const parsed = parser['parseTypescript'](srcFile, '/');
  parsed.imports.forEach(mport => {
    if (mport.constructor.name === 'NamedImport') {
      mport.specifiers.forEach(specifier => {
        imports[specifier.alias || specifier.specifier] = { mport, specifier };
      });
    } else if (mport.constructor.name === 'NamespaceImport') {
      imports[mport.alias || mport.libraryName] = { mport };
    }
  });

  return imports;
}

// function getInputs (klass) {
//   const inputs = { attributes: [], properties: [] };
//   (klass.properties || []).forEach(prop => {
//     const key = prop.name;
//     const body = this.typescript.substring(prop.start, prop.end);
//     if (body.match(/@Input\(/)) {
//       const attrName =
//         prop.body ? (prop.body.match(/@Input\(['"](.*?)['"]\)/) || [])[1] : prop.name;
//       inputs.attributes.push(`[${attrName || key}]="${key}"`);
//       inputs.properties.push(`${key}: ${prop.type};`);
//     }
//   });

//   return inputs;
// }

function getInputs (klass) {
  const inputs = { attributes: [], properties: [] };
  (klass.properties || []).forEach(prop => {
    const key = prop.name;
    const body = this.typescript.substring(prop.start, prop.end);
    if (body.match(/@Input\(/)) {
      const attrName =
        prop.body ? (prop.body.match(/@Input\(['"](.*?)['"]\)/) || [])[1] : prop.name;
      inputs.attributes.push(`[${attrName || key}]="${key}"`);
      inputs.properties.push(`${key}: ${prop.type};`);
    }
  });

  return inputs;
}

function getOutputs (klass) {
  const outputs = { attributes: [], properties: [] };
  (klass.properties || []).forEach(prop => {
    const key = prop.name;
    const body = this.typescript.substring(prop.start, prop.end);
    if (body.match(/@Output\(/)) {
      const attrName =
        prop.body ? (prop.body.match(/@Input\(['"](.*?)['"]\)/) || [])[1] : prop.name;
      const funcName = `on${key.replace(/^[a-z]/, x => x.toUpperCase())}`;
      outputs.attributes.push(`(${attrName || key})="${funcName}($event)"`);
      outputs.properties.push(`${funcName}(event): void { /* */ }`);
    }
  });

  return outputs;
}

// imports needed for this a class constructor
// e.g., { '@angular/core': [ 'Component', 'PLATFORM_ID' ], ...}
function getImports (klass) {
  const imports = {};
  const constructorParams = (klass.ctor && klass.ctor.parameters) || [];

  imports['@angular/core'] = ['Component'];
  imports[`./${path.basename(this.tsPath)}`.replace(/.ts$/, '')] = [klass.name];

  constructorParams.forEach((param, index) => {
    const paramBody = this.typescript.substring(param.start, param.end);

    const injectMatches = paramBody.match(/@Inject\(([A-Z0-9_]+)\)/) || [];
    const injectClassName = injectMatches[1];
    if (injectClassName) { // e.g. @Inject(LOCALE_ID) language
      const iimport = this.imports[injectClassName];
      imports[iimport.mport.libraryName] = imports[iimport.mport.libraryName] || [];
      imports[iimport.mport.libraryName].push(injectClassName);
      // imports[iimport.mport.libraryName].push(param.type);
    } else {
      const className = (param.type || '').replace(/<[^>]+>/, '');
      const iimport = this.imports[className];

      if (iimport) {
        const importStr = iimport.mport.alias ?
          `${iimport.specifier.specifier} as ${iimport.mport.alias}` : iimport.specifier.specifier;
        imports[iimport.mport.libraryName] = imports[iimport.mport.libraryName] || [];
        imports[iimport.mport.libraryName].push(importStr);
      }
    }
  });

  return imports;
}

/* @returns @Component providers: code */
function getProviders (klass) {
  const constructorParams = (klass.ctor && klass.ctor.parameters) || [];
  const providers = {};

  constructorParams.forEach((param, index) => { // name, type, start, end
    const paramBody = this.typescript.substring(param.start, param.end);
    const injectMatches = paramBody.match(/@Inject\(([A-Z0-9_]+)\)/i) || [];
    const injectClassName = injectMatches[1];
    const className = (param.type || '').replace(/<[^>]+>/, '');
    const iimport = this.imports[className];

    if (injectClassName === 'DOCUMENT') {
      providers[param.name] = `{ provide: DOCUMENT, useClass: MockDocument }`;
    } else if (injectClassName === 'PLATFORM_ID') {
      providers[param.name] = `{ provide: 'PLATFORM_ID', useValue: 'browser' }`;
    } else if (injectClassName === 'LOCALE_ID') {
      providers[param.name] = `{ provide: 'LOCALE_ID', useValue: 'en' }`;
    } else if (param.type === 'ActivatedRoute') {
      providers[param.name] = `{
          provide: ActivatedRoute,
          useValue: {
            snapshot: {url: 'url', params: {}, queryParams: {}, data: {}},
            url: observableOf('url'),
            params: observableOf({}),
            queryParams: observableOf({}),
            fragment: observableOf('fragment'),
            data: observableOf({})
          }
        }`;
    } else if (injectClassName) {
      providers[param.name] = `{ provide: ${injectClassName}, useValue: ${injectClassName} }`;
    // } else if (param.type.match(/^(ElementRef|Router|HttpClient|TranslateService)$/)) {
    //   providers[param.name] = `{ provide: ${param.type}, useClass: Mock${param.type} }`;
    } else if (this.config.providerMocks[param.type]) {
      providers[param.name] = `{ provide: ${param.type}, useClass: Mock${param.type} }`;
    } else if (iimport && iimport.mport.libraryName.match(/^(\.|src\/)/)) { // user-defined classes
      providers[param.name] = `{ provide: ${param.type}, useClass: Mock${param.type} }`;
    } else {
      providers[param.name] = param.type;
    }
  });

  return providers;
}

/* @returns mock data for this test */
/* ctorParams : { key: <value in JS object> */
function getProviderMocks (klass, ctorParams) {
  const mocks = {};
  // const providers = this._getProviders(klass);
  /* { var: { provide: 'Class', useClass: 'MockClass'}, ...} */

  function getCtorVarsJS (varName) {
    const vars = ctorParams[varName];
    vars && (delete vars.undefined); // TODO figure out why 'undefined' is here
    return Object.entries(vars || {}).map(([key, value]) => {
      // console.log(`>>>>>>>>>>>>>>>> `, {key, value});
      return `${key} = ${Util.objToJS(value)};`;
    });
  }

  const constructorParams = (klass.ctor && klass.ctor.parameters) || [];
  constructorParams.forEach(param => {
    const iimport = this.imports[param.type];
    const ctorVars = getCtorVarsJS(param.name);
    const typeVars = 
      iimport && iimport.mport.libraryName.match(/^(\.|src\/)/) ? [] : this.config.providerMocks[param.type];

    if (typeVars) {
      const mockVars = ctorVars.concat(typeVars).join('\n');
      mocks[param.type] = `
        @Injectable()
        class Mock${param.type} {
          ${mockVars}
        }`;
    }
  });

  return mocks;
}

function getExistingTests(ejsData, existingTestCodes) {
  const existingTests = {};
  const allTests = Object.assign({}, ejsData.accessorTests || {}, ejsData.functionTests || {});
  for (var funcName in allTests) {
    // e.g. compoent.myFuncName(any, goes, here);
    const re = new RegExp(`\\S+\.${funcName}\\(?[\\s\\S]*\\)?;`, 'm');
    existingTests[funcName] = !!existingTestCodes.match(re);
  }

  return existingTests;
}

function getGenerated (ejsData, options) {
  let generated;
  const funcName = options.method;
  const specPath = path.resolve(this.tsPath.replace(/\.ts$/, '.spec.ts')); 
  const existingTestCodes = fs.existsSync(specPath) && fs.readFileSync(specPath, 'utf8');
  if (funcName) {
    // if user asks to generate only one function
    generated = ejsData.functionTests[funcName] || ejsData.accessorTests[funcName];
  } else if (existingTestCodes && specPath && !options.force && !options.forcePrint) {
    // if there is existing tests, then add only new function tests at the end
    const existingTests = getExistingTests(ejsData, existingTestCodes);
    const newTests = [];
    const allTests = Object.assign({}, ejsData.accessorTests || {}, ejsData.functionTests || {});
    // get only new tests
    for (var method in existingTests) {
      (existingTests[method] !== true) && newTests.push('  // new test by ngentest' + allTests[method]); 
    }
    if (newTests.length) {
      // add new tests at the end
      const re = /(\s+}\);?\s+)(}\);?\s*)$/;
      const testEndingMatch = existingTestCodes.match(re); // file ending parts
      if (testEndingMatch) {
        generated = existingTestCodes.replace(re, (m0, m1, m2) => {
          const newCodes = newTests.join('\n').replace(/[ ]+$/, '');
          return `${m1}${newCodes}${m2}`;
        });
      }
    } else {
      generated = ejs.render(this.template, ejsData).replace(/\n\s+$/gm, '\n');
    }
  } else {
    // if no existing tests
    generated = ejs.render(this.template, ejsData).replace(/\n\s+$/gm, '\n');
  }
  return generated;
}

function writeToSpecFile (specPath, generated) {
  fs.writeFileSync(specPath, generated);
  console.log('Generated unit test to', specPath);
}

function backupExistingFile (specPath, generated) {
  if (fs.existsSync(specPath)) {
    const backupTime = (new Date()).toISOString().replace(/[^\d]/g, '').slice(0, -5);
    const backupContents = fs.readFileSync(specPath, 'utf8');
    if (backupContents !== generated) {
      fs.writeFileSync(`${specPath}.${backupTime}`, backupContents, 'utf8'); // write backup
      console.log('Backup the exisiting file to', `${specPath}.${backupTime}`);
    }
  }
};

function writeGenerated (generated, options) {
  const toFile = options.spec;
  const force = options.force;
  const specPath = path.resolve(this.tsPath.replace(/\.ts$/, '.spec.ts'));
  generated = generated.replace(/\r\n/g, '\n');

  const specFileExists = fs.existsSync(specPath);

  if (toFile && specFileExists && force) {
    backupExistingFile(specPath, generated);
    writeToSpecFile(specPath, generated);
  } else if (toFile && specFileExists && !force) {
    const readline = require('readline');
    const rl = readline.createInterface(process.stdin, process.stdout);
    console.warn('\x1b[33m%s\x1b[0m',
      `WARNING!!, Spec file, ${specPath} already exists. Overwrite it?`);
    rl.question('Continue? ', answer => {
      if (answer.match(/y/i)) {
        backupExistingFile(specPath, generated);
        writeToSpecFile(specPath, generated);
      } else {
        process.stdout.write(generated);
      }
      rl.close();
    });
  } else if (toFile && !specFileExists) {
    backupExistingFile(specPath, generated);
    writeToSpecFile(specPath, generated);
  } else if (!toFile) {
    process.stdout.write(generated);
  }
}

const CommonTestFunctions = {
  getKlass, // class info.
  getKlassImports, // imports info.

  getInputs, // input coddes
  getOutputs, // output codes
  getImports, // import statements code
  getProviders, // module provider code
  getProviderMocks, // module provider mock code

  getGenerated,
  writeGenerated
};

module.exports = CommonTestFunctions;
