export interface ConversionResult {
  success: boolean;
  code: string;
  errors: string[];
  warnings: string[];
  components: ComponentInfo[];
}

export interface ComponentInfo {
  name: string;
  props: string[];
  state: string[];
  effects: string[];
  isClass: boolean;
}

export interface StateVariable {
  name: string;
  setter: string;
  type: string;
  initial: string;
}

export interface ComponentBodyResult {
  stateDeclarations: string;
  methods: string;
  convertedBody: string;
}