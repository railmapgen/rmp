import React from 'react';
import { CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import {
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
    defaultStationAttributes,
} from '../../../constants/stations';
import { RmgFieldsFieldDetail, RmgFieldsFieldSpecificAttributes } from '../../panels/details/rmg-field-specific-attrs';
import { MultilineText } from '../common/multiline-text';
import { LINE_HEIGHT } from './bjsubway-basic';

const PATH_ARROW =
    'M 8.359893 4.159288 C 8.368828 4.168825 8.460953 4.26852 8.57038 4.386985 C 8.679807 4.505449 8.860802 4.701382 8.972592 4.822389 C 9.084381 4.943397 9.238666 5.110407 9.315445 5.193521 C 9.392224 5.276636 9.519867 5.414817 9.599094 5.500589 C 9.678323 5.58636 9.801023 5.719209 9.871761 5.795812 C 9.942499 5.872413 10.000208 5.935256 9.999999 5.935465 C 9.999792 5.935671 9.975513 5.928466 9.946045 5.919453 C 9.916577 5.910439 9.831826 5.88438 9.757708 5.861543 C 9.683591 5.838706 9.532284 5.791997 9.421472 5.757746 C 9.310658 5.723495 9.190374 5.686309 9.154173 5.675113 C 9.11797 5.663918 9.048485 5.642428 8.99976 5.627359 C 8.951035 5.612291 8.910275 5.599729 8.909181 5.599446 C 8.907193 5.59893 8.907193 5.59893 8.907135 5.798288 C 8.907103 5.907935 8.906695 6.128369 8.906229 6.288144 C 8.905446 6.555825 8.905249 6.580968 8.903705 6.608245 C 8.902784 6.624527 8.90139 6.647987 8.900606 6.660379 C 8.899822 6.672773 8.898192 6.695836 8.896983 6.711632 C 8.895774 6.727427 8.893582 6.753074 8.892114 6.768627 C 8.890645 6.784179 8.888061 6.80923 8.88637 6.824296 C 8.884679 6.839362 8.88172 6.864065 8.879793 6.879189 C 8.877868 6.894315 8.874691 6.917777 8.872734 6.931325 C 8.870777 6.944874 8.867386 6.967292 8.865197 6.981143 C 8.863009 6.994995 8.859045 7.018654 8.856388 7.03372 C 8.853731 7.048786 8.849344 7.072617 8.84664 7.086676 C 8.843935 7.100736 8.839338 7.1236 8.836424 7.137486 C 8.833509 7.151371 8.828584 7.174065 8.825479 7.187916 C 8.822371 7.201767 8.817014 7.224831 8.81357 7.239167 C 8.810127 7.253505 8.80431 7.276767 8.800644 7.29086 C 8.796978 7.304955 8.791035 7.327222 8.787437 7.340344 C 8.78384 7.353467 8.77752 7.375735 8.773395 7.389829 C 8.769268 7.403923 8.762319 7.426986 8.757952 7.441081 C 8.753583 7.455174 8.746363 7.47784 8.741903 7.491448 C 8.737446 7.505056 8.729829 7.527523 8.724978 7.541374 C 8.720126 7.555225 8.712182 7.577493 8.707321 7.590858 C 8.702462 7.604224 8.6948 7.624901 8.690294 7.636807 C 8.68579 7.648715 8.677304 7.670452 8.671437 7.685113 C 8.665571 7.699773 8.656536 7.721842 8.651362 7.734155 C 8.646187 7.746468 8.63796 7.765688 8.63308 7.776865 C 8.628201 7.788043 8.620145 7.806136 8.615178 7.817071 C 8.610211 7.828006 8.60083 7.848286 8.594332 7.862138 C 8.587832 7.875988 8.573873 7.904618 8.563307 7.92576 C 8.552743 7.946901 8.537873 7.975929 8.530265 7.990266 C 8.522656 8.004602 8.511053 8.026075 8.504479 8.037983 C 8.497905 8.04989 8.486739 8.069772 8.479666 8.082165 C 8.472593 8.094558 8.460988 8.11444 8.453878 8.126348 C 8.446768 8.138254 8.435438 8.156944 8.428702 8.167879 C 8.421966 8.178814 8.410628 8.196906 8.403507 8.208085 C 8.396386 8.219262 8.384013 8.238349 8.37601 8.2505 C 8.36801 8.26265 8.354345 8.282929 8.345645 8.295566 C 8.336946 8.308201 8.322885 8.328276 8.314397 8.340175 C 8.305909 8.352074 8.292209 8.37096 8.283951 8.382147 C 8.275693 8.393333 8.261178 8.41259 8.251695 8.42494 C 8.242211 8.437289 8.225837 8.458165 8.215304 8.471332 C 8.204773 8.484497 8.189062 8.503819 8.18039 8.514267 C 8.17172 8.524716 8.157459 8.541616 8.148703 8.551823 C 8.139945 8.562029 8.125004 8.579116 8.115499 8.589793 C 8.105992 8.600471 8.091457 8.616575 8.083197 8.625581 C 8.074937 8.634586 8.060843 8.649709 8.05188 8.659185 C 8.042916 8.668662 8.018659 8.69335 7.997974 8.714046 C 7.977291 8.734741 7.953162 8.758432 7.944355 8.766693 C 7.935549 8.774953 7.920821 8.788638 7.911628 8.797104 C 7.902433 8.805571 7.887569 8.819082 7.878597 8.827129 C 7.869623 8.835177 7.853733 8.849096 7.843284 8.858062 C 7.832834 8.867027 7.816133 8.881153 7.806171 8.889453 C 7.796208 8.897753 7.779904 8.911098 7.769942 8.919111 C 7.759978 8.927123 7.743874 8.939848 7.734154 8.947388 C 7.724434 8.954926 7.708329 8.96721 7.698366 8.974683 C 7.688403 8.982156 7.673093 8.993497 7.664346 8.999885 C 7.655598 9.006271 7.637505 9.019163 7.62414 9.02853 C 7.610775 9.037899 7.588109 9.053377 7.573772 9.062926 C 7.559434 9.072475 7.538474 9.086151 7.527194 9.093318 C 7.515913 9.100485 7.497422 9.112045 7.486104 9.119009 C 7.474786 9.125973 7.454846 9.137918 7.441793 9.145553 C 7.428741 9.153188 7.405677 9.166317 7.390542 9.174728 C 7.375406 9.18314 7.352087 9.19579 7.338722 9.20284 C 7.325357 9.209889 7.303686 9.221025 7.290564 9.227587 C 7.277442 9.234147 7.256366 9.2444 7.243731 9.250369 C 7.231095 9.256339 7.211213 9.265569 7.199549 9.27088 C 7.187884 9.27619 7.168797 9.28464 7.157134 9.289659 C 7.145469 9.294676 7.124792 9.303333 7.111184 9.308895 C 7.097576 9.31446 7.075367 9.323255 7.061831 9.328442 C 7.048295 9.333629 7.027816 9.341289 7.016323 9.345462 C 7.00483 9.349636 6.978328 9.358748 6.95743 9.365711 C 6.936532 9.372675 6.906311 9.382359 6.890272 9.38723 C 6.874235 9.392101 6.849581 9.399302 6.835486 9.403231 C 6.821393 9.40716 6.796739 9.413705 6.7807 9.417776 C 6.764662 9.421847 6.740208 9.427785 6.726356 9.430971 C 6.712505 9.434157 6.689641 9.439174 6.675548 9.442118 C 6.661452 9.445063 6.639384 9.449434 6.626504 9.451833 C 6.613625 9.454231 6.591038 9.458187 6.57631 9.460623 C 6.561581 9.463058 6.538518 9.46664 6.525058 9.468584 C 6.511598 9.470528 6.487662 9.473704 6.471867 9.475644 C 6.456071 9.477583 6.433207 9.480169 6.421057 9.481392 C 6.408907 9.482615 6.387236 9.4846 6.372898 9.485805 C 6.358561 9.487008 6.333112 9.488794 6.316345 9.489771 C 6.299578 9.490749 6.276316 9.491956 6.264652 9.492452 C 6.252987 9.492949 6.216803 9.493517 6.18424 9.493716 C 6.151678 9.493916 6.114499 9.493756 6.10162 9.493363 C 6.088739 9.49297 6.06866 9.492202 6.056995 9.491656 C 6.045331 9.491112 6.026046 9.490059 6.014138 9.489319 C 6.002231 9.488579 5.982548 9.487186 5.970398 9.486226 C 5.958248 9.485266 5.939956 9.483668 5.92975 9.482677 C 5.919544 9.481687 5.902445 9.479897 5.891753 9.478702 C 5.881061 9.477505 5.864443 9.475529 5.854823 9.47431 C 5.845204 9.47309 5.827708 9.470707 5.815943 9.469012 C 5.804178 9.467319 5.784412 9.464314 5.77202 9.462336 C 5.759627 9.460358 5.745908 9.458071 5.741535 9.457253 C 5.733583 9.455767 5.733583 9.455767 5.750813 9.451963 C 5.76029 9.449871 5.778183 9.445793 5.790576 9.442902 C 5.802969 9.440009 5.82305 9.435088 5.8352 9.431966 C 5.847351 9.428843 5.867067 9.423503 5.879014 9.420099 C 5.890961 9.416695 5.911639 9.410524 5.924964 9.406386 C 5.938288 9.402248 5.960324 9.395124 5.973932 9.390556 C 5.98754 9.385988 6.008053 9.378835 6.019516 9.374659 C 6.030978 9.370483 6.050462 9.363131 6.062815 9.358321 C 6.075166 9.353508 6.094417 9.34577 6.105595 9.341125 C 6.116774 9.336478 6.135264 9.328524 6.146685 9.323448 C 6.158106 9.318373 6.177591 9.309499 6.189984 9.303728 C 6.202377 9.297957 6.224247 9.287379 6.238585 9.280221 C 6.252921 9.273063 6.273399 9.262563 6.284092 9.256887 C 6.294784 9.251213 6.314865 9.240225 6.328716 9.232468 C 6.342567 9.224712 6.361654 9.213777 6.371131 9.208166 C 6.380608 9.202557 6.396514 9.192982 6.406477 9.18689 C 6.41644 9.180798 6.432345 9.170843 6.441822 9.164769 C 6.4513 9.158695 6.467404 9.14816 6.47761 9.141357 C 6.487816 9.134555 6.50392 9.123611 6.513398 9.117039 C 6.522875 9.110467 6.539177 9.098936 6.549627 9.091415 C 6.560077 9.083895 6.577971 9.070704 6.589391 9.062101 C 6.600812 9.053498 6.618895 9.039583 6.629575 9.031179 C 6.640255 9.022773 6.656757 9.009534 6.666247 9.001758 C 6.675736 8.993981 6.692227 8.980227 6.702893 8.971191 C 6.713559 8.962157 6.730458 8.94742 6.740448 8.938442 C 6.750437 8.929464 6.766562 8.914768 6.776282 8.905784 C 6.786003 8.896801 6.803698 8.880239 6.815604 8.868983 C 6.827512 8.857727 6.843456 8.842402 6.851037 8.834927 C 6.858617 8.827451 6.873728 8.812176 6.884615 8.800982 C 6.895503 8.789788 6.912683 8.77174 6.922792 8.760878 C 6.932902 8.750012 6.949699 8.731606 6.960117 8.719973 C 6.970537 8.70834 6.986147 8.690599 6.994807 8.68055 C 7.003467 8.670501 7.017852 8.65353 7.026772 8.642838 C 7.035693 8.632146 7.053 8.610872 7.065231 8.595562 C 7.077464 8.580254 7.09533 8.557407 7.104936 8.544792 C 7.114541 8.532177 7.129989 8.511499 7.139265 8.498842 C 7.14854 8.486185 7.164221 8.464337 7.174109 8.450293 C 7.183999 8.436249 7.199718 8.413383 7.209044 8.399484 C 7.218369 8.385583 7.232209 8.364666 7.2398 8.353003 C 7.247391 8.341338 7.260236 8.321177 7.268346 8.3082 C 7.276455 8.295223 7.289493 8.27395 7.297318 8.260925 C 7.305143 8.247901 7.317313 8.227304 7.32436 8.215153 C 7.331408 8.203004 7.344023 8.180735 7.352394 8.165669 C 7.360765 8.150602 7.372812 8.128534 7.379167 8.116627 C 7.385522 8.104719 7.396764 8.083248 7.404151 8.06891 C 7.411537 8.054573 7.422352 8.0331 7.428184 8.021194 C 7.434016 8.009287 7.443347 7.990001 7.448918 7.978336 C 7.45449 7.966672 7.463351 7.947784 7.468609 7.936364 C 7.473868 7.924943 7.482234 7.906453 7.4872 7.895274 C 7.492166 7.884096 7.500586 7.86481 7.505909 7.852417 C 7.511233 7.840024 7.519759 7.819808 7.524855 7.807493 C 7.529951 7.795179 7.538242 7.7747 7.543279 7.761986 C 7.548316 7.749271 7.556671 7.727735 7.561847 7.714127 C 7.567022 7.700519 7.57545 7.677853 7.580575 7.663759 C 7.585701 7.649664 7.594637 7.624414 7.600433 7.607646 C 7.60623 7.59088 7.615365 7.563642 7.620735 7.547118 C 7.626104 7.530593 7.634661 7.503554 7.63975 7.48703 C 7.644838 7.470506 7.653173 7.442472 7.658273 7.424733 C 7.663371 7.406994 7.671309 7.378562 7.675913 7.361553 C 7.680518 7.344542 7.688414 7.314123 7.69346 7.293953 C 7.698508 7.273784 7.705483 7.244955 7.708961 7.229889 C 7.712439 7.214823 7.717614 7.19176 7.720461 7.178638 C 7.723308 7.165516 7.728016 7.143247 7.730923 7.129154 C 7.733829 7.115059 7.738621 7.090804 7.74157 7.075251 C 7.74452 7.0597 7.749294 7.033455 7.752179 7.016931 C 7.755066 7.000407 7.759431 6.974154 7.761884 6.958592 C 7.764333 6.94303 7.768123 6.917978 7.770304 6.902922 C 7.772485 6.887866 7.775877 6.86322 7.777843 6.848155 C 7.779809 6.833088 7.783001 6.807043 7.784938 6.790275 C 7.786876 6.773509 7.789651 6.74806 7.791106 6.733722 C 7.792561 6.719385 7.794953 6.693936 7.796421 6.677169 C 7.797888 6.660402 7.800071 6.632964 7.801272 6.616198 C 7.802474 6.599431 7.804076 6.575174 7.804832 6.562295 C 7.80559 6.549416 7.806592 6.532119 7.807061 6.523856 C 7.807529 6.515595 7.80835 6.421553 7.808886 6.314875 C 7.809421 6.208197 7.809724 6.003942 7.80956 5.860975 C 7.809398 5.718009 7.809015 5.600789 7.808712 5.600486 C 7.808408 5.600182 7.68663 5.63752 7.538092 5.68346 C 7.389553 5.7294 7.213946 5.783698 7.147853 5.804122 C 7.08176 5.824546 6.974794 5.857548 6.910151 5.877461 C 6.845508 5.897371 6.776261 5.918652 6.75627 5.924749 C 6.736279 5.930848 6.719744 5.935658 6.719525 5.93544 C 6.719306 5.935221 6.790938 5.857274 6.878708 5.762224 C 6.966477 5.667175 7.110461 5.511271 7.198671 5.415771 C 7.286881 5.320272 7.433807 5.161213 7.525173 5.062309 C 7.616539 4.963404 7.76605 4.801562 7.857421 4.702663 C 7.948792 4.603762 8.093983 4.446596 8.180069 4.353404 C 8.266154 4.260212 8.341831 4.178411 8.34824 4.171626 L 8.359893 4.159288 Z M 3.639928 8.15987 C 3.639606 8.15984 3.567056 8.081517 3.478708 7.985821 C 3.390359 7.890125 3.197014 7.680786 3.049051 7.520623 C 2.901089 7.36046 2.662314 7.101986 2.518441 6.946236 C 2.374568 6.790486 2.198977 6.60038 2.128238 6.523779 C 2.0575 6.447177 1.999793 6.384333 2 6.384126 C 2.000208 6.383919 2.024487 6.391125 2.053954 6.40014 C 2.083422 6.409154 2.157237 6.431839 2.217988 6.450549 C 2.278738 6.469259 2.375968 6.499262 2.434052 6.517222 C 2.492137 6.535182 2.553174 6.55407 2.569692 6.559195 C 2.586209 6.564321 2.709718 6.602509 2.844157 6.644057 C 2.978595 6.685606 3.089538 6.719839 3.090698 6.72013 C 3.092807 6.72066 3.092807 6.72066 3.092866 6.520418 C 3.092898 6.410285 3.093306 6.18985 3.093772 6.030562 C 3.094553 5.763748 3.094752 5.738617 3.096295 5.711344 C 3.097217 5.695064 3.098611 5.671603 3.099395 5.659211 C 3.100178 5.646816 3.101808 5.623754 3.103017 5.607958 C 3.104227 5.592164 3.106418 5.566515 3.107887 5.550963 C 3.109355 5.535411 3.111941 5.51036 3.113633 5.495295 C 3.115324 5.480227 3.118114 5.456767 3.119833 5.443159 C 3.121551 5.429551 3.124544 5.407283 3.126484 5.393674 C 3.128424 5.380066 3.13179 5.357599 3.133963 5.343748 C 3.136135 5.329897 3.139918 5.307034 3.142369 5.292939 C 3.144819 5.278845 3.149205 5.254788 3.152116 5.239479 C 3.155027 5.224168 3.159971 5.199397 3.163101 5.184428 C 3.16623 5.169459 3.171352 5.145801 3.174481 5.131851 C 3.17761 5.117902 3.182986 5.094759 3.18643 5.080422 C 3.189873 5.066085 3.19569 5.042824 3.199356 5.028729 C 3.203022 5.014635 3.208965 4.992367 3.212563 4.979245 C 3.21616 4.966123 3.222479 4.943855 3.226605 4.929761 C 3.230732 4.915667 3.237681 4.892604 3.242049 4.878509 C 3.246417 4.864415 3.253638 4.84175 3.258096 4.828142 C 3.262555 4.814533 3.270171 4.792067 3.275023 4.778216 C 3.279873 4.764364 3.287818 4.742096 3.292678 4.728731 C 3.297538 4.715366 3.3052 4.694689 3.309704 4.682783 C 3.31421 4.670875 3.322696 4.649137 3.328563 4.634478 C 3.33443 4.619817 3.343463 4.597748 3.348639 4.585434 C 3.353813 4.573122 3.36204 4.553902 3.36692 4.542725 C 3.371799 4.531547 3.379856 4.513454 3.384823 4.502518 C 3.389789 4.491583 3.39917 4.471303 3.405668 4.457452 C 3.412167 4.443601 3.426129 4.414971 3.436694 4.39383 C 3.44726 4.372689 3.461914 4.344058 3.469262 4.330207 C 3.476608 4.316357 3.488427 4.294487 3.495524 4.281607 C 3.502622 4.268728 3.514584 4.247454 3.522105 4.234332 C 3.529628 4.22121 3.541034 4.201699 3.547455 4.190976 C 3.553874 4.180251 3.564621 4.162556 3.571336 4.151653 C 3.578052 4.14075 3.589372 4.122683 3.596493 4.111505 C 3.603614 4.100327 3.615987 4.081241 3.623989 4.069091 C 3.631991 4.056941 3.645655 4.036661 3.654354 4.024024 C 3.663054 4.011388 3.677115 3.991314 3.685603 3.979416 C 3.694091 3.967517 3.707792 3.948628 3.716049 3.937443 C 3.724308 3.926256 3.738823 3.906999 3.748305 3.89465 C 3.757787 3.882301 3.774164 3.861424 3.784696 3.848259 C 3.795227 3.835093 3.810939 3.815771 3.81961 3.805323 C 3.828281 3.794872 3.84254 3.777973 3.851297 3.767766 C 3.860054 3.757562 3.874996 3.740475 3.884502 3.729796 C 3.894008 3.719119 3.908543 3.703013 3.916803 3.694009 C 3.925064 3.685003 3.939156 3.669882 3.94812 3.660404 C 3.957083 3.650928 3.981341 3.626241 4.002025 3.605544 C 4.02271 3.584848 4.046838 3.561157 4.055645 3.552897 C 4.064451 3.544637 4.079179 3.530951 4.088373 3.522486 C 4.097566 3.514019 4.11243 3.500508 4.121404 3.49246 C 4.130376 3.484412 4.146267 3.470493 4.156716 3.461528 C 4.167165 3.452562 4.183867 3.438437 4.19383 3.430137 C 4.203792 3.421837 4.220096 3.408491 4.230059 3.400478 C 4.240022 3.392467 4.256126 3.379735 4.265846 3.372187 C 4.275566 3.364638 4.294852 3.349997 4.308703 3.33965 C 4.322554 3.329302 4.342636 3.314602 4.353327 3.306981 C 4.364019 3.299361 4.382311 3.28654 4.393975 3.27849 C 4.405639 3.270441 4.42466 3.257609 4.436245 3.249977 C 4.447829 3.242345 4.465922 3.230637 4.476451 3.223961 C 4.486979 3.217284 4.504342 3.206445 4.515034 3.199872 C 4.525727 3.193299 4.545155 3.181674 4.558207 3.174039 C 4.571259 3.166403 4.594323 3.153273 4.609458 3.14486 C 4.624594 3.13645 4.647913 3.123799 4.661278 3.11675 C 4.674643 3.1097 4.696314 3.098564 4.709436 3.092004 C 4.722558 3.085442 4.74403 3.075004 4.757153 3.068806 C 4.770275 3.062607 4.791488 3.052789 4.804292 3.046986 C 4.817096 3.041182 4.837177 3.03234 4.848916 3.027336 C 4.860656 3.022333 4.879611 3.014428 4.89104 3.009769 C 4.902469 3.00511 4.923146 2.996942 4.93699 2.991619 C 4.950833 2.986296 4.971702 2.978476 4.983366 2.97424 C 4.99503 2.970004 5.021672 2.960841 5.042571 2.953878 C 5.063468 2.946914 5.093689 2.937231 5.109727 2.93236 C 5.125765 2.927489 5.150419 2.920288 5.164514 2.916359 C 5.178607 2.912431 5.203261 2.905885 5.219299 2.901814 C 5.235338 2.897742 5.259793 2.891805 5.273643 2.888619 C 5.287495 2.885432 5.310359 2.880417 5.324453 2.877472 C 5.338548 2.874528 5.360616 2.870155 5.373496 2.867757 C 5.386374 2.865358 5.408962 2.861403 5.42369 2.858968 C 5.438418 2.856532 5.461482 2.85295 5.474941 2.851007 C 5.488403 2.849062 5.512338 2.845885 5.528134 2.843946 C 5.543929 2.842007 5.566793 2.83942 5.578943 2.838198 C 5.591094 2.836976 5.612764 2.83499 5.627101 2.833786 C 5.641439 2.832582 5.666887 2.830797 5.683655 2.829821 C 5.700423 2.828844 5.724281 2.827635 5.736673 2.827131 C 5.749067 2.826628 5.779487 2.825963 5.804273 2.825654 C 5.831717 2.825312 5.864715 2.825499 5.888661 2.826133 C 5.910288 2.826705 5.935936 2.827562 5.945656 2.828037 C 5.955376 2.828513 5.97327 2.829513 5.98542 2.830258 C 5.99757 2.831004 6.017452 2.832401 6.029602 2.833363 C 6.041752 2.834323 6.060044 2.83592 6.07025 2.836912 C 6.080456 2.837903 6.097554 2.839693 6.108246 2.840889 C 6.118938 2.842084 6.135557 2.84406 6.145177 2.84528 C 6.154796 2.846498 6.172292 2.848883 6.184057 2.850577 C 6.195822 2.852271 6.215388 2.855248 6.227539 2.857194 C 6.239688 2.859139 6.253395 2.861429 6.257997 2.862283 C 6.266363 2.863834 6.266363 2.863834 6.249159 2.867633 C 6.239698 2.869721 6.221817 2.873796 6.209424 2.876689 C 6.197031 2.87958 6.17695 2.884501 6.1648 2.887624 C 6.152649 2.890747 6.132933 2.896087 6.120986 2.899491 C 6.109038 2.902895 6.088361 2.909066 6.075037 2.913204 C 6.061712 2.917341 6.039675 2.924465 6.026067 2.929032 C 6.012459 2.933601 5.991946 2.940756 5.980484 2.944931 C 5.969021 2.949106 5.949537 2.95646 5.937186 2.961273 C 5.924834 2.966085 5.905422 2.973896 5.894048 2.978628 C 5.882673 2.983361 5.864182 2.991314 5.852958 2.996302 C 5.841733 3.001288 5.822409 3.010091 5.810017 3.015862 C 5.797623 3.021632 5.775753 3.032209 5.761416 3.039369 C 5.747078 3.046527 5.726601 3.057027 5.715909 3.062701 C 5.705216 3.068377 5.685135 3.079366 5.671284 3.087121 C 5.657433 3.094877 5.638347 3.105814 5.628869 3.111423 C 5.619392 3.117034 5.603487 3.126609 5.593524 3.1327 C 5.58356 3.138793 5.567655 3.148746 5.558177 3.15482 C 5.5487 3.160895 5.532596 3.171429 5.522389 3.178233 C 5.512184 3.185035 5.496079 3.195978 5.486602 3.202551 C 5.477125 3.209123 5.460822 3.220655 5.450372 3.228179 C 5.439923 3.235703 5.423421 3.247832 5.413702 3.255136 C 5.403981 3.262436 5.386883 3.27556 5.375705 3.284297 C 5.364527 3.293035 5.346831 3.307168 5.336382 3.315704 C 5.325933 3.32424 5.308455 3.338784 5.297544 3.348024 C 5.286631 3.357265 5.269532 3.372169 5.259547 3.381148 C 5.249561 3.390125 5.233438 3.404821 5.223718 3.413807 C 5.213998 3.422791 5.196302 3.439351 5.184396 3.450605 C 5.172488 3.461862 5.156544 3.477188 5.148963 3.484664 C 5.141382 3.492139 5.126272 3.507414 5.115385 3.518608 C 5.104497 3.529801 5.087317 3.547848 5.077208 3.558713 C 5.067098 3.569577 5.050301 3.587983 5.039882 3.599617 C 5.029463 3.61125 5.013853 3.62899 5.005193 3.639039 C 4.996532 3.649089 4.982148 3.666059 4.973228 3.676752 C 4.964307 3.687445 4.947 3.708717 4.934769 3.724027 C 4.922537 3.739336 4.90467 3.762184 4.895064 3.774798 C 4.885458 3.787414 4.870011 3.808089 4.860735 3.820748 C 4.85146 3.833405 4.835779 3.855252 4.825891 3.869297 C 4.816002 3.883342 4.800281 3.906206 4.790956 3.920107 C 4.781631 3.934007 4.767791 3.954923 4.760201 3.966587 C 4.75261 3.978251 4.739764 3.998412 4.731654 4.01139 C 4.723545 4.024366 4.710507 4.04564 4.702682 4.058664 C 4.694856 4.071689 4.682687 4.092286 4.67564 4.104437 C 4.668592 4.116586 4.655977 4.138854 4.647606 4.15392 C 4.639235 4.168986 4.627187 4.191055 4.620833 4.202963 C 4.614478 4.214869 4.603237 4.236342 4.59585 4.250679 C 4.588463 4.265017 4.577648 4.286489 4.571816 4.298396 C 4.565984 4.310304 4.556654 4.329589 4.551082 4.341253 C 4.54551 4.352918 4.536649 4.371806 4.53139 4.383226 C 4.526132 4.394647 4.517766 4.413137 4.512801 4.424315 C 4.507834 4.435493 4.499414 4.45478 4.494091 4.467174 C 4.488767 4.479566 4.480241 4.499781 4.475145 4.512096 C 4.470048 4.524411 4.461758 4.544889 4.456721 4.557603 C 4.451684 4.570319 4.443329 4.591855 4.438153 4.605463 C 4.432978 4.619071 4.42455 4.641737 4.419425 4.65583 C 4.414299 4.669925 4.405364 4.695175 4.399567 4.711941 C 4.393771 4.72871 4.384635 4.755947 4.379265 4.772473 C 4.373896 4.788996 4.365339 4.816035 4.36025 4.83256 C 4.355162 4.849085 4.346827 4.877117 4.341728 4.894857 C 4.336629 4.912596 4.328691 4.941027 4.324087 4.958037 C 4.319483 4.975048 4.311586 5.005467 4.30654 5.025636 C 4.301492 5.045806 4.294517 5.074635 4.291039 5.0897 C 4.287562 5.104767 4.282386 5.12783 4.279539 5.140952 C 4.276692 5.154074 4.271984 5.176342 4.269077 5.190436 C 4.266171 5.20453 4.261379 5.228786 4.25843 5.244339 C 4.25548 5.259891 4.250707 5.286135 4.24782 5.302659 C 4.244935 5.319183 4.240569 5.345436 4.238118 5.360997 C 4.235666 5.37656 4.231877 5.40161 4.229696 5.416667 C 4.227515 5.431724 4.224122 5.456368 4.222157 5.471435 C 4.220191 5.486501 4.216998 5.512547 4.215061 5.529314 C 4.213124 5.546082 4.210349 5.571529 4.208893 5.585867 C 4.207439 5.600204 4.205048 5.625653 4.20358 5.642421 C 4.202112 5.659187 4.199928 5.686625 4.198727 5.703393 C 4.197526 5.720159 4.195924 5.744415 4.195167 5.757294 C 4.194409 5.770174 4.193407 5.787471 4.192938 5.795733 C 4.192471 5.803995 4.19165 5.898036 4.191115 6.004715 C 4.19058 6.111393 4.190277 6.315648 4.190439 6.458614 C 4.190602 6.601581 4.190984 6.718802 4.191288 6.719105 C 4.191591 6.719408 4.313371 6.682069 4.461908 6.636129 C 4.610447 6.590189 4.786054 6.535892 4.852147 6.515468 C 4.91824 6.495043 5.025205 6.462041 5.089849 6.442131 C 5.154491 6.422219 5.223739 6.400939 5.243729 6.39484 C 5.263721 6.388742 5.280256 6.383932 5.280475 6.38415 C 5.280694 6.384369 5.209062 6.462315 5.121291 6.557364 C 5.033521 6.652413 4.889537 6.808317 4.801327 6.903816 C 4.713117 6.999316 4.56619 7.158374 4.474826 7.25728 C 4.383461 7.356185 4.23395 7.518026 4.14258 7.616927 C 4.051209 7.715828 3.906015 7.872994 3.819926 7.966186 C 3.733837 8.059378 3.658251 8.141094 3.651957 8.147776 C 3.645663 8.154458 3.64025 8.159901 3.639928 8.15987 Z';

const BjsubwayIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultBjsubwayIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultBjsubwayIntStationAttributes.nameOffsetY,
        outOfStation = defaultBjsubwayIntStationAttributes.outOfStation,
    } = attrs[StationType.BjsubwayInt] ?? defaultBjsubwayIntStationAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );
    const onPointerMove = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerMove(id, e),
        [id, handlePointerMove]
    );
    const onPointerUp = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerUp(id, e),
        [id, handlePointerUp]
    );

    const getTextOffset = (oX: NameOffsetX, oY: NameOffsetY) => {
        if (oX === 'left' && oY === 'top') {
            return [-5, -names[1].split('\n').length * LINE_HEIGHT[oY] - 4];
        } else if (oX === 'middle' && oY === 'top') {
            return [0, -names[1].split('\n').length * LINE_HEIGHT[oY] - 7];
        } else if (oX === 'right' && oY === 'top') {
            return [5, -names[1].split('\n').length * LINE_HEIGHT[oY] - 4];
        } else if (oX === 'left' && oY === 'bottom') {
            return [-5, names[0].split('\n').length * LINE_HEIGHT[oY] + 4];
        } else if (oX === 'middle' && oY === 'bottom') {
            return [0, names[0].split('\n').length * LINE_HEIGHT[oY] + 7];
        } else if (oX === 'right' && oY === 'bottom') {
            return [5, names[0].split('\n').length * LINE_HEIGHT[oY] + 4];
        } else if (oX === 'left' && oY === 'middle') {
            return [-8, 0];
        } else if (oX === 'right' && oY === 'middle') {
            return [8, 0];
        } else return [0, 0];
    };
    const [textX, textY] = getTextOffset(nameOffsetX, nameOffsetY);
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id}>
            <g transform={`translate(${x - 6}, ${y - 6})`}>
                <circle cx="6" cy="6" r="6" stroke="black" strokeWidth="1" fill="white" />
                <path
                    d={PATH_ARROW}
                    fill={outOfStation ? '#898989' : 'black'}
                    stroke={outOfStation ? '#898989' : 'black'}
                    strokeWidth="0.533618"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <circle
                    id={`stn_core_${id}`}
                    cx="6"
                    cy="6"
                    r="6"
                    stroke="black"
                    strokeWidth="1"
                    strokeOpacity="0"
                    fill="white"
                    fillOpacity="0"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                    className="removeMe"
                />
            </g>
            <g transform={`translate(${x + textX}, ${y + textY})`} textAnchor={textAnchor}>
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={LINE_HEIGHT.zh}
                    lineHeight={LINE_HEIGHT.zh}
                    grow="up"
                    className="rmp-name__zh"
                    baseOffset={1}
                />
                <MultilineText
                    text={names[1].split('\n')}
                    fontSize={LINE_HEIGHT.en}
                    lineHeight={LINE_HEIGHT.en}
                    grow="down"
                    className="rmp-name__en"
                    baseOffset={1}
                />
            </g>
        </g>
    );
};

/**
 * BjsubwayIntStation specific props.
 */
export interface BjsubwayIntStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    outOfStation: boolean;
}

const defaultBjsubwayIntStationAttributes: BjsubwayIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    outOfStation: false,
};

const bjsubwayIntStationFields = [
    {
        type: 'textarea',
        label: 'panel.details.stations.common.nameZh',
        value: (attrs?: BjsubwayIntStationAttributes) => (attrs ?? defaultBjsubwayIntStationAttributes).names[0],
        onChange: (val: string | number, attrs_: BjsubwayIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayIntStationAttributes;
            // set value
            attrs.names[0] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'textarea',
        label: 'panel.details.stations.common.nameEn',
        value: (attrs?: BjsubwayIntStationAttributes) => (attrs ?? defaultBjsubwayIntStationAttributes).names[1],
        onChange: (val: string | number, attrs_: BjsubwayIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayIntStationAttributes;
            // set value
            attrs.names[1] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.stations.common.nameOffsetX',
        value: (attrs?: BjsubwayIntStationAttributes) => (attrs ?? defaultBjsubwayIntStationAttributes).nameOffsetX,
        options: { left: 'left', middle: 'middle', right: 'right' },
        disabledOptions: (attrs?: BjsubwayIntStationAttributes) => (attrs?.nameOffsetY === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: BjsubwayIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayIntStationAttributes;
            // set value
            attrs.nameOffsetX = val as NameOffsetX;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.stations.common.nameOffsetY',
        value: (attrs?: BjsubwayIntStationAttributes) => (attrs ?? defaultBjsubwayIntStationAttributes).nameOffsetY,
        options: { top: 'top', middle: 'middle', bottom: 'bottom' },
        disabledOptions: (attrs?: BjsubwayIntStationAttributes) => (attrs?.nameOffsetX === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: BjsubwayIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayIntStationAttributes;
            // set value
            attrs.nameOffsetY = val as NameOffsetY;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'switch',
        label: 'panel.details.stations.bjsubwayInt.outOfStation',
        oneLine: true,
        isChecked: (attrs?: BjsubwayIntStationAttributes) =>
            (attrs ?? defaultBjsubwayIntStationAttributes).outOfStation,
        onChange: (val: boolean, attrs_: BjsubwayIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayIntStationAttributes;
            // set value
            attrs.outOfStation = val;
            // return modified attrs
            return attrs;
        },
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={bjsubwayIntStationFields as RmgFieldsFieldDetail<BjsubwayIntStationAttributes>}
    />
);

const bjsubwayIntStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <g transform="translate(6, 6)">
            <circle cx="6" cy="6" r="6" stroke="black" strokeWidth="1" fill="white" />
            <path d={PATH_ARROW} stroke="black" strokeWidth="0.533618" strokeLinecap="round" strokeLinejoin="round" />
        </g>
    </svg>
);

const bjsubwayIntStation: Station<BjsubwayIntStationAttributes> = {
    component: BjsubwayIntStation,
    icon: bjsubwayIntStationIcon,
    defaultAttrs: defaultBjsubwayIntStationAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.stations.bjsubwayInt.displayName',
        cities: [CityCode.Beijing],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: ['interchange'],
    },
};

export default bjsubwayIntStation;
