'use client'

interface LogoProps {
  className?: string
  showTagline?: boolean
  iconOnly?: boolean
  wordmarkOnly?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  invertInDark?: boolean
}

// Path data extracted directly from official brand vector assets
const EMBLEM_PATH = "M 321,27 L 356,28 L 384,34 L 412,45 L 436,59 L 442,65 L 395,129 L 379,118 L 360,109 L 341,105 L 326,105 L 310,108 L 291,116 L 275,127 L 261,141 L 157,141 L 169,121 L 186,99 L 210,75 L 225,63 L 249,48 L 271,38 L 294,31 L 311,28 L 320,28 Z M 483,32 L 583,32 L 320,389 L 320,391 L 479,392 L 519,460 L 269,460 L 178,583 L 79,583 L 342,224 L 185,223 L 143,155 L 392,155 L 482,33 Z M 514,149 L 528,177 L 541,215 L 550,258 L 553,289 L 553,332 L 548,374 L 540,408 L 526,446 L 486,378 L 454,378 L 461,333 L 461,284 L 458,258 L 452,233 L 513,150 Z M 140,175 L 178,237 L 213,237 L 208,262 L 205,295 L 206,337 L 213,377 L 149,464 L 135,433 L 123,394 L 117,364 L 113,314 L 114,282 L 119,244 L 128,207 L 140,176 Z M 407,474 L 512,475 L 500,495 L 485,515 L 456,545 L 438,559 L 422,569 L 404,578 L 382,586 L 351,592 L 317,592 L 297,589 L 273,582 L 252,573 L 218,551 L 268,483 L 280,493 L 301,505 L 324,511 L 342,511 L 357,508 L 376,500 L 393,488 L 406,475 Z"

const WORDMARK_PATH = "M 102,190 L 191,190 L 192,191 L 192,207 L 176,219 L 172,221 L 169,224 L 165,226 L 147,240 L 140,244 L 136,248 L 132,250 L 129,254 L 130,255 L 131,254 L 133,254 L 134,255 L 142,255 L 143,254 L 190,254 L 191,255 L 192,254 L 193,255 L 193,269 L 101,269 L 101,265 L 102,264 L 101,263 L 101,255 L 105,251 L 168,206 L 167,205 L 102,205 L 101,204 L 101,194 L 102,193 L 102,191 Z M 203,190 L 226,190 L 226,191 L 233,198 L 233,199 L 248,215 L 248,216 L 256,225 L 257,225 L 261,221 L 266,214 L 273,207 L 273,206 L 287,190 L 309,190 L 305,196 L 287,215 L 287,216 L 280,223 L 280,224 L 265,241 L 265,269 L 248,269 L 248,240 L 213,202 L 213,201 L 203,191 Z M 319,190 L 394,190 L 395,191 L 398,191 L 403,194 L 407,200 L 407,204 L 408,205 L 408,225 L 407,226 L 407,229 L 405,233 L 400,238 L 395,240 L 337,240 L 336,241 L 336,269 L 319,269 L 319,191 Z M 437,190 L 493,190 L 493,191 L 485,198 L 484,198 L 477,205 L 446,205 L 444,206 L 441,209 L 441,234 L 434,241 L 433,241 L 424,249 L 424,202 L 426,197 L 430,193 L 434,191 L 436,191 Z M 502,190 L 513,190 L 515,192 L 515,196 L 514,198 L 513,198 L 507,204 L 506,204 L 494,215 L 493,215 L 486,222 L 485,222 L 463,242 L 456,247 L 434,267 L 431,269 L 423,269 L 421,267 L 421,260 L 426,254 L 433,249 L 447,236 L 454,231 L 461,224 L 468,219 L 494,196 L 501,191 Z M 541,190 L 609,190 L 609,205 L 549,205 L 545,209 L 545,251 L 548,254 L 551,254 L 552,255 L 554,255 L 555,254 L 609,254 L 609,266 L 610,267 L 609,269 L 540,269 L 533,266 L 531,264 L 528,258 L 528,201 L 529,200 L 529,198 L 535,192 L 540,191 Z M 638,190 L 701,190 L 702,191 L 705,191 L 711,195 L 714,200 L 714,203 L 715,204 L 715,256 L 714,257 L 713,262 L 708,267 L 703,269 L 637,269 L 630,266 L 628,264 L 625,258 L 625,201 L 627,197 L 632,192 L 637,191 Z M 732,190 L 807,190 L 808,191 L 811,191 L 817,195 L 820,201 L 820,207 L 821,208 L 821,224 L 820,225 L 819,232 L 816,236 L 811,239 L 808,239 L 807,240 L 750,240 L 749,241 L 749,269 L 732,269 L 732,191 Z M 839,190 L 922,190 L 922,205 L 857,205 L 856,206 L 856,221 L 857,222 L 909,222 L 910,223 L 910,236 L 909,237 L 857,237 L 856,238 L 856,253 L 857,254 L 861,254 L 862,255 L 864,254 L 908,254 L 909,255 L 911,255 L 912,254 L 919,254 L 920,255 L 922,254 L 922,269 L 839,269 L 839,191 Z M 512,205 L 513,205 L 513,256 L 512,257 L 511,262 L 506,267 L 501,269 L 439,269 L 455,255 L 461,255 L 462,254 L 463,255 L 464,254 L 471,254 L 472,255 L 488,254 L 489,255 L 490,254 L 492,254 L 496,250 L 496,219 L 511,206 Z M 387,206 L 386,205 L 337,205 L 336,206 L 336,224 L 337,225 L 386,225 L 390,221 L 390,209 L 388,207 Z M 694,206 L 693,205 L 646,205 L 642,209 L 642,251 L 645,254 L 650,254 L 651,255 L 655,255 L 656,254 L 671,254 L 672,255 L 673,254 L 694,254 L 698,250 L 698,210 L 695,206 Z M 800,206 L 799,205 L 750,205 L 749,206 L 749,224 L 750,225 L 798,225 L 803,221 L 803,209 L 801,207 Z M 361,244 L 383,244 L 413,269 L 389,269 L 362,245 Z M 774,244 L 797,244 L 803,250 L 804,250 L 826,269 L 802,269 L 775,245 L 774,245 Z"

export default function ZyrocoreLogo({
  className = '',
  showTagline = false,
  iconOnly = false,
  wordmarkOnly = false,
  size = 'md',
  invertInDark = true,
}: LogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }

  const wordmarkSizes = {
    sm: 'h-4',
    md: 'h-5',
    lg: 'h-7',
    xl: 'h-9',
  }

  return (
    <div
      className={`inline-flex flex-col select-none ${className}`}
      role="img"
      aria-label="ZYRØCORE Logo"
    >
      <div className="flex items-center gap-2.5">
        {/* Official Monogram Emblem (Z in Ø) */}
        {!wordmarkOnly && (
          <svg
            viewBox="78 26 507 567"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className={`${iconSizes[size]} flex-shrink-0 transition-colors duration-200`}
            aria-hidden="true"
          >
            <path fillRule="evenodd" clipRule="evenodd" d={EMBLEM_PATH} />
          </svg>
        )}

        {/* Official Wordmark Vector (ZYRØCORE) */}
        {!iconOnly && (
          <svg
            viewBox="100 189 823 81"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className={`${wordmarkSizes[size]} w-auto flex-shrink-0 transition-colors duration-200`}
            aria-hidden="true"
          >
            <path fillRule="evenodd" clipRule="evenodd" d={WORDMARK_PATH} />
          </svg>
        )}
      </div>

      {showTagline && !iconOnly && (
        <span className="text-[9px] tracking-[0.28em] font-bold text-muted-foreground uppercase mt-1.5 leading-none">
          Built for Ambitious
        </span>
      )}
    </div>
  )
}
