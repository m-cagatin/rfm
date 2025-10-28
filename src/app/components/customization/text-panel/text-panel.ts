import { Component, EventEmitter, Output, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontLoaderService } from '../../../services/font-loader.service';

@Component({
  selector: 'app-text-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './text-panel.html',
  styleUrl: './text-panel.css'
})
export class TextPanelComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  @Output() fontSelected = new EventEmitter<string>();
  @Output() preDesignedSelected = new EventEmitter<any>();
  @Output() uploadFonts = new EventEmitter<FileList>();

  protected query = signal('');

  fonts: string[] = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Garamond',
    'Courier New',
    'Roboto','Open Sans','Lato','Montserrat','Oswald','Poppins','Nunito','Merriweather','Playfair Display',
    'Inter','Work Sans','Rubik','Source Sans 3','Noto Sans','Raleway','Ubuntu','Fira Sans','PT Sans','Karla',
    'Muli','Quicksand','Josefin Sans','Cabin','Anton','Bebas Neue','Dancing Script','Great Vibes','Pacifico',
    'Lobster','Caveat','Bitter','Crimson Text','Domine','Spectral','Libre Baskerville','Abril Fatface',
    'Arvo','Inconsolata','IBM Plex Sans','IBM Plex Serif','Space Grotesk','Space Mono','Manrope',
    'Barlow','DM Sans','Exo 2','Fjalla One','Archivo','Titillium Web','Mukta','Zilla Slab','Cormorant',
    'Comfortaa','Alegreya','Alegreya Sans','Vollkorn','Hind','Slabo 27px','Crimson Pro','Old Standard TT',
    'Archivo Black','Audiowide','Righteous','Saira','Signika','Asap','Oxygen','Varela Round','Catamaran',
    'Abel','Shadows Into Light','Indie Flower','Permanent Marker','Amatic SC','Satisfy','Kalam','Courgette',
    'Yellowtail','Cookie','Pacifico','Tangerine','Bad Script','Architect\'s Daughter','Patrick Hand'
  ];

  predesigned = [
    // Bold Impact Styles
    { title: 'SALE', subtitle: '50% OFF', style: 'impact', fontFamily: 'Anton', fontSize: 72, subtitleSize: 36, fill: '#FF0000', fontWeight: 'bold', textAlign: 'center' },
    { title: 'VINTAGE', subtitle: '1979', style: 'vintage', fontFamily: 'Abril Fatface', fontSize: 64, subtitleSize: 32, fill: '#8B4513', fontWeight: 'normal', textAlign: 'center' },
    { title: 'CUSTOM NAME', subtitle: 'Team', style: 'sports', fontFamily: 'Bebas Neue', fontSize: 68, subtitleSize: 28, fill: '#000000', fontWeight: 'bold', textAlign: 'center' },
    { title: 'SUMMER VIBES', subtitle: 'Beach', style: 'modern', fontFamily: 'Poppins', fontSize: 56, subtitleSize: 24, fill: '#FF6B35', fontWeight: '600', textAlign: 'center' },
    
    // Elegant Styles
    { title: 'Elegant', subtitle: 'Design', style: 'elegant', fontFamily: 'Playfair Display', fontSize: 60, subtitleSize: 26, fill: '#2C3E50', fontWeight: 'bold', textAlign: 'center' },
    { title: 'Classy', subtitle: 'Style', style: 'classy', fontFamily: 'Cormorant', fontSize: 64, subtitleSize: 28, fill: '#34495E', fontWeight: 'bold', textAlign: 'center' },
    { title: 'Luxury', subtitle: 'Brand', style: 'luxury', fontFamily: 'Cinzel', fontSize: 58, subtitleSize: 24, fill: '#D4AF37', fontWeight: 'bold', textAlign: 'center' },
    
    // Fun & Casual
    { title: 'Happy Days', subtitle: 'Always', style: 'fun', fontFamily: 'Pacifico', fontSize: 52, subtitleSize: 24, fill: '#FFD700', fontWeight: 'normal', textAlign: 'center' },
    { title: 'Good Vibes', subtitle: 'Only', style: 'casual', fontFamily: 'Comfortaa', fontSize: 50, subtitleSize: 22, fill: '#3498DB', fontWeight: 'bold', textAlign: 'center' },
    { title: 'Stay Wild', subtitle: '', style: 'wild', fontFamily: 'Permanent Marker', fontSize: 60, subtitleSize: 0, fill: '#E74C3C', fontWeight: 'normal', textAlign: 'center' },
    
    // Modern & Clean
    { title: 'MINIMAL', subtitle: '', style: 'minimal', fontFamily: 'Inter', fontSize: 58, subtitleSize: 0, fill: '#000000', fontWeight: '300', textAlign: 'center' },
    { title: 'BOLD', subtitle: 'Statement', style: 'bold', fontFamily: 'Montserrat', fontSize: 70, subtitleSize: 26, fill: '#1A1A1A', fontWeight: 'black', textAlign: 'center' },
    { title: 'URBAN', subtitle: 'Culture', style: 'urban', fontFamily: 'Oswald', fontSize: 64, subtitleSize: 24, fill: '#2C3E50', fontWeight: 'bold', textAlign: 'center' },
    
    // Retro & Vintage
    { title: 'RETRO', subtitle: '80s Style', style: 'retro', fontFamily: 'Alfa Slab One', fontSize: 62, subtitleSize: 28, fill: '#FF6F61', fontWeight: 'normal', textAlign: 'center' },
    { title: 'CLASSIC', subtitle: 'Since 1990', style: 'classic', fontFamily: 'Merriweather', fontSize: 54, subtitleSize: 24, fill: '#5D4E37', fontWeight: 'bold', textAlign: 'center' },
    { title: 'OLD SCHOOL', subtitle: '', style: 'oldschool', fontFamily: 'Righteous', fontSize: 58, subtitleSize: 0, fill: '#8B0000', fontWeight: 'normal', textAlign: 'center' },
    
    // Script & Handwritten
    { title: 'Love', subtitle: '', style: 'script', fontFamily: 'Great Vibes', fontSize: 68, subtitleSize: 0, fill: '#C71585', fontWeight: 'normal', textAlign: 'center' },
    { title: 'Dream Big', subtitle: '', style: 'handwritten', fontFamily: 'Dancing Script', fontSize: 56, subtitleSize: 0, fill: '#9B59B6', fontWeight: 'bold', textAlign: 'center' },
    { title: 'Be Kind', subtitle: '', style: 'casual-script', fontFamily: 'Caveat', fontSize: 60, subtitleSize: 0, fill: '#16A085', fontWeight: 'bold', textAlign: 'center' },
    
    // Sporty & Athletic
    { title: 'CHAMPION', subtitle: '01', style: 'sporty', fontFamily: 'Bebas Neue', fontSize: 72, subtitleSize: 36, fill: '#000000', fontWeight: 'bold', textAlign: 'center' },
    { title: 'LEGENDS', subtitle: 'Never Die', style: 'athletic', fontFamily: 'Archivo Black', fontSize: 66, subtitleSize: 28, fill: '#C0392B', fontWeight: 'normal', textAlign: 'center' },
    { title: 'GAME ON', subtitle: '', style: 'game', fontFamily: 'Audiowide', fontSize: 62, subtitleSize: 0, fill: '#27AE60', fontWeight: 'normal', textAlign: 'center' }
  ];

  filteredFonts(): string[] {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.fonts;
    return this.fonts.filter(f => f.toLowerCase().includes(q));
  }

  onClose(): void {
    this.closed.emit();
  }

  onSelectFont(font: string): void {
    this.fontSelected.emit(font);
  }

  onSelectPreDesigned(template: any): void {
    this.preDesignedSelected.emit(template);
  }

  constructor(private fontLoader: FontLoaderService) {
    // Load fonts for the currently visible subset so previews reflect real typography
    effect(() => {
      const sample = this.filteredFonts().slice(0, 14);
      sample.forEach(f => this.fontLoader.loadGoogleFont(f));
    });
  }

  ngOnInit(): void {
    ['Roboto','Inter','Poppins','Montserrat','Oswald','Playfair Display','Lato','Open Sans']
      .forEach(f => this.fontLoader.loadGoogleFont(f));
  }

  onUploadClick(input: HTMLInputElement): void {
    input.click();
  }

  async onUploadChange(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const files = input.files ?? undefined;
    if (files && files.length) {
      this.uploadFonts.emit(files);
      for (const file of Array.from(files)) {
        const inferred = this.inferFamilyName(file.name);
        await this.fontLoader.registerUploadedFont(inferred, file);
        if (!this.fonts.includes(inferred)) {
          this.fonts = [inferred, ...this.fonts];
        }
      }
    }
  }

  private inferFamilyName(fileName: string): string {
    const base = fileName.replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/, '');
    return base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
