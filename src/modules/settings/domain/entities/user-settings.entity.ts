export type ThemeType = 'light' | 'dark' | 'system';
export type LanguageType = 'pt-BR' | 'en-US' | 'es';
export type FontSizeType = 'small' | 'medium' | 'large';

export class UserSettings {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    private _theme: ThemeType,
    private _language: LanguageType,
    private _fontSize: FontSizeType,
    private _compactMode: boolean,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  get theme(): ThemeType {
    return this._theme;
  }
  get language(): LanguageType {
    return this._language;
  }
  get fontSize(): FontSizeType {
    return this._fontSize;
  }
  get compactMode(): boolean {
    return this._compactMode;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  update(data: {
    theme?: ThemeType;
    language?: LanguageType;
    fontSize?: FontSizeType;
    compactMode?: boolean;
  }): void {
    if (data.theme !== undefined) this._theme = data.theme;
    if (data.language !== undefined) this._language = data.language;
    if (data.fontSize !== undefined) this._fontSize = data.fontSize;
    if (data.compactMode !== undefined) this._compactMode = data.compactMode;
    this._updatedAt = new Date();
  }
}
