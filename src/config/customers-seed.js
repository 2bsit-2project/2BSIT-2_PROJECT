const VALID_PAYTERMS = ['COD', '30D', '45D'];

const DEFAULT_CUSTOMERS = [
  { custno: 'C0001', custname: 'Globus Medical, Inc', address: '2560 Gen Armistead Ave Audubon CA 94031', payterm: '30D', status: 'Active' },
  { custno: 'C0002', custname: 'RF Industries, Inc', address: '7610 Miramar Rd San Diego, CA 92602', payterm: '45D', status: 'Active' },
  { custno: 'C0003', custname: 'Trisha Macdowell', address: '7642 Clairemont Mesa Blvd San Diego CA 90321', payterm: 'COD', status: 'Active' },
  { custno: 'C0004', custname: 'HMS Holdings, Inc', address: '1000 So Fremont Ave, Suite 225 Alhambara CA 91303', payterm: '45D', status: 'Active' },
  { custno: 'C0005', custname: 'Christian Andersen', address: '1120 Lincoln St Suite 809 Sacramento CA 95815', payterm: 'COD', status: 'Active' },
  { custno: 'C0006', custname: 'Astronics, Inc', address: '2 Orion Aliso Viejo, CA 92656', payterm: '30D', status: 'Active' },
  { custno: 'C0007', custname: 'Morgan Alegore', address: '2 Goodyear Irvine, CA 92618', payterm: 'COD', status: 'Active' },
  { custno: 'C0008', custname: 'Abaxis, Inc', address: '3240 Whipple Rd, Union City, CA 94587', payterm: '30D', status: 'Active' },
  { custno: 'C0009', custname: 'Landec Corp.', address: '3603 Haven Avenue Menlo Park, CA 94025', payterm: '30D', status: 'Active' },
  { custno: 'C0010', custname: 'SMP Corp.', address: '3718 Northern Long Island NY 12528', payterm: '45D', status: 'Active' },
  { custno: 'C0011', custname: 'B&G Foods', address: '4 Gatehall Dr., Ste. 110 Parsippany, NJ 07054', payterm: '45D', status: 'Active' },
  { custno: 'C0012', custname: 'Dexter Santos', address: '2739 Rebeiro Ave, Santa Clara, CA 95051', payterm: 'COD', status: 'Active' },
  { custno: 'C0013', custname: 'Health Stream', address: '209 10th Ave, South Suite 450 Nashville Tennessee', payterm: '45D', status: 'Active' },
  { custno: 'C0014', custname: 'InSync Training LLC', address: 'P.O. Box 3122 Roanoke, VA 24015', payterm: '30D', status: 'Active' },
  { custno: 'C0015', custname: 'Bespoke Education', address: '8205 Santa Monica Blvd, Suite 365 W HWood CA 90046', payterm: '30D', status: 'Active' },
  { custno: 'C0016', custname: 'Peri Solutions', address: '2880 Zanker Road San Jose CA 95101', payterm: '30D', status: 'Active' },
  { custno: 'C0017', custname: 'Janet Lim', address: '800 N. State College Blvd. Fullerton, CA 92831', payterm: 'COD', status: 'Active' },
  { custno: 'C0018', custname: 'Nicole Hutchison', address: '200 Lincoln Ave, Salinas, CA 93901', payterm: 'COD', status: 'Active' },
  { custno: 'C0019', custname: 'Brandon Drucker', address: '65 West Alisal St., # 101, Salinas, CA 93901', payterm: 'COD', status: 'Active' },
  { custno: 'C0020', custname: 'Eugene Whitaker', address: '45 Fremont Street, Suite 2000 San Frans, CA 9410', payterm: 'COD', status: 'Active' },
  { custno: 'C0021', custname: 'Touch Suite', address: '1081 Holland Dr. Boca Raton, FL 33487', payterm: '30D', status: 'Active' },
  { custno: 'C0022', custname: 'CallFire', address: '1410 2nd St., Suite 200 Santa Monica, CA 90401', payterm: '45D', status: 'Active' },
  { custno: 'C0023', custname: 'ISBX Corp', address: '3415 S. Sepulveda Blvd. 1250 Los Angeles, CA 90034', payterm: '30D', status: 'Active' },
  { custno: 'C0024', custname: 'Factual', address: '1999 Avenue of the Stars Los Angeles, CA 90067', payterm: '30D', status: 'Active' },
  { custno: 'C0025', custname: 'Predixion', address: '31910 Del Obispo San Juan Capistrano, CA 92675', payterm: '45D', status: 'Active' },
  { custno: 'C0026', custname: 'Datapop', address: '5762 W Jefferson Blvd, Los Angeles, CA 90016', payterm: '45D', status: 'Active' },
  { custno: 'C0027', custname: 'SA Photonics, Inc', address: '130 Knowles Dr, Los Gatos, CA 95032', payterm: '30D', status: 'Active' },
  { custno: 'C0028', custname: 'Acumen Bldg Entp', address: '7770 Pardee Lane, Ste. 200 Oakland, CA 94621', payterm: '30D', status: 'Active' },
  { custno: 'C0029', custname: 'IMCorp', address: '50 Utopia Road Manchester, CT 06042', payterm: '30D', status: 'Active' }
];

module.exports = {
  VALID_PAYTERMS,
  DEFAULT_CUSTOMERS
};
